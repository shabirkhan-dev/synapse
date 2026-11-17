import { afterAll, describe, expect, test } from "bun:test";
import { WEB_PAGE_ERROR_CODES } from "@synapse/core/contracts";

import { createWebPageReader, decodeEntities, htmlToText, isPublicAddress } from "../src/web";

describe("isPublicAddress", () => {
	test("refuses loopback, private, link-local (metadata), CGNAT, reserved and tunnelling IPv6", () => {
		for (const address of [
			"127.0.0.1",
			"10.1.2.3",
			"172.20.0.1",
			"192.168.1.1",
			"169.254.169.254",
			"100.64.0.1",
			"0.0.0.0",
			"224.0.0.1",
			"255.255.255.255",
			"::1",
			"::",
			"fd00::1",
			"fe80::1",
			"::ffff:127.0.0.1",
			"::ffff:169.254.169.254",
			"64:ff9b::a9fe:a9fe",
			"2002:7f00:1::",
			"not-an-ip",
		]) {
			expect([address, isPublicAddress(address)]).toEqual([address, false]);
		}
	});

	test("allows public IPv4 and IPv6", () => {
		for (const address of ["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
			expect([address, isPublicAddress(address)]).toEqual([address, true]);
		}
	});
});

describe("htmlToText", () => {
	test("keeps the main content as Markdown-ish text: headings, lists, paragraphs, entities", async () => {
		const page = await htmlToText(`<!doctype html><html><head><title>Refunds &amp; returns</title>
			<style>.x{color:red}</style><script>var secret = 1</script></head><body>
			<header><nav><a href="/">Home</a> | Shop</nav></header>
			<main><h1>Refund policy</h1><p>Refunds are <b>accepted</b> within 30&nbsp;days &mdash; no receipt&#33;</p>
			<h2>Exceptions</h2><ul><li>Gift cards</li><li>Sale items</li></ul>
			<script>alert(1)</script><form><button>Subscribe</button></form></main>
			<footer>© Shop 2026</footer></body></html>`);
		expect(page.title).toBe("Refunds & returns");
		expect(page.text).toBe(
			"# Refund policy\n\nRefunds are accepted within 30 days — no receipt!\n\n## Exceptions\n\n- Gift cards\n- Sale items",
		);
	});

	test("without <main> or <article>, the body minus its page header and footer; title from the first heading", async () => {
		const page = await htmlToText(
			"<body><header>Site</header><div><h2>Shipping</h2><p>Two   business\n days.</p></div><footer>Bye</footer></body>",
		);
		expect(page).toEqual({ title: "Shipping", text: "## Shipping\n\nTwo business days." });
	});

	test("entities: numeric, hex, named; unknown names stay", () => {
		expect(decodeEntities("&#65;&#x42;&lt;&amp;&bogus;")).toBe("AB<&&bogus;");
	});
});

// A local server stands in for the web; tests point public host names at it.
const server = Bun.serve({
	port: 0,
	fetch(request) {
		const path = new URL(request.url).pathname;
		const host = request.headers.get("host");
		if (path === "/page") {
			return new Response(`<title>Hello</title><main><h1>Hi from ${host}</h1></main>`, {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}
		if (path === "/text")
			return new Response("plain words", { headers: { "content-type": "text/plain" } });
		if (path === "/to-internal") {
			return new Response(null, {
				status: 302,
				headers: { location: "http://internal.test/page" },
			});
		}
		if (path === "/to-page")
			return new Response(null, { status: 301, headers: { location: "/page" } });
		if (path === "/loop")
			return new Response(null, { status: 302, headers: { location: "/loop" } });
		if (path === "/pdf")
			return new Response("%PDF", { headers: { "content-type": "application/pdf" } });
		if (path === "/big") {
			return new Response("x".repeat(4096), { headers: { "content-type": "text/plain" } });
		}
		if (path === "/slow") return new Promise<Response>(() => {});
		if (path === "/missing") return new Response("no", { status: 404 });
		return new Response("?", { status: 500 });
	},
});
afterAll(() => server.stop(true));

/**
 * `public.test` resolves to a public address but the request really goes to the local server: the
 * reader connects to the checked address, so we let the test's fetch swap it for 127.0.0.1.
 */
const PUBLIC = "93.184.216.34";
function reader(options: Parameters<typeof createWebPageReader>[0] = {}) {
	const requests: { url: string; host: string | null }[] = [];
	const local: typeof fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(String(input));
		requests.push({ url: url.href, host: new Headers(init?.headers).get("host") });
		url.hostname = "127.0.0.1";
		url.port = String(server.port);
		return fetch(url, init);
	}) as typeof fetch;
	const instance = createWebPageReader({
		resolve: async (hostname) =>
			({
				"public.test": [PUBLIC],
				"internal.test": ["10.0.0.5"],
				"mixed.test": [PUBLIC, "127.0.0.1"],
			})[hostname] ?? [],
		fetch: local,
		...options,
	});
	return { instance, requests };
}

const codeOf = async (promise: Promise<unknown>) =>
	promise.then(
		() => "resolved",
		(error: { code?: string }) => error.code,
	);

describe("createWebPageReader", () => {
	test("reads a page from the checked address, sending the real host name", async () => {
		const { instance, requests } = reader();
		const page = await instance.read("http://public.test/page");
		expect(page).toEqual({
			url: "http://public.test/page",
			title: "Hello",
			text: "# Hi from public.test",
			mediaType: "text/html",
		});
		expect(requests[0]).toEqual({ url: `http://${PUBLIC}/page`, host: "public.test" });
	});

	test("plain text is kept as it is; a same-site redirect is followed and reported", async () => {
		const { instance } = reader();
		expect((await instance.read("http://public.test/text")).text).toBe("plain words");
		expect((await instance.read("http://public.test/to-page")).url).toBe("http://public.test/page");
	});

	test("refuses private hosts, mixed records, odd schemes, ports and credentials before connecting", async () => {
		const { instance, requests } = reader();
		for (const url of [
			"http://internal.test/page",
			"http://mixed.test/page",
			"http://127.0.0.1/page",
			"http://[::1]/page",
			"http://169.254.169.254/latest/meta-data",
			"file:///etc/passwd",
			"ftp://public.test/page",
			"http://public.test:8080/page",
			"http://user:pass@public.test/page",
			"not a url",
		]) {
			// oxlint-disable-next-line no-await-in-loop -- one at a time
			expect([url, await codeOf(instance.read(url))]).toEqual([
				url,
				WEB_PAGE_ERROR_CODES.NOT_ALLOWED,
			]);
		}
		expect(requests).toHaveLength(0);
	});

	test("a redirect into the private network is refused at that hop", async () => {
		const { instance, requests } = reader();
		expect(await codeOf(instance.read("http://public.test/to-internal"))).toBe(
			WEB_PAGE_ERROR_CODES.NOT_ALLOWED,
		);
		expect(requests.map((request) => request.url)).toEqual([`http://${PUBLIC}/to-internal`]);
	});

	test("limits: redirects, type, size, time, unknown hosts and error statuses", async () => {
		const { instance } = reader({ maxBytes: 1024, timeoutMs: 300 });
		expect(await codeOf(instance.read("http://public.test/loop"))).toBe(
			WEB_PAGE_ERROR_CODES.TOO_MANY_REDIRECTS,
		);
		expect(await codeOf(instance.read("http://public.test/pdf"))).toBe(
			WEB_PAGE_ERROR_CODES.UNSUPPORTED_TYPE,
		);
		expect(await codeOf(instance.read("http://public.test/big"))).toBe(
			WEB_PAGE_ERROR_CODES.TOO_LARGE,
		);
		expect(await codeOf(instance.read("http://public.test/slow"))).toBe(
			WEB_PAGE_ERROR_CODES.TIMEOUT,
		);
		expect(await codeOf(instance.read("http://nowhere.test/page"))).toBe(
			WEB_PAGE_ERROR_CODES.UNREACHABLE,
		);
		expect(await codeOf(instance.read("http://public.test/missing"))).toBe(
			WEB_PAGE_ERROR_CODES.UNREACHABLE,
		);
	});

	test("https keeps the host name for TLS (SNI and certificate) while connecting to the address", async () => {
		const inits: RequestInit[] = [];
		const instance = createWebPageReader({
			resolve: async () => [PUBLIC],
			fetch: (async (_input: string | URL | Request, init?: RequestInit) => {
				inits.push(init ?? {});
				return new Response("ok", { headers: { "content-type": "text/plain" } });
			}) as typeof fetch,
		});
		await instance.read("https://public.test/a");
		expect((inits[0] as { tls?: { serverName?: string } }).tls).toEqual({
			serverName: "public.test",
		});
	});

	test("allowPrivateNetworks (tests only) lifts the address and port rules", async () => {
		const instance = createWebPageReader({ allowPrivateNetworks: true });
		const page = await instance.read(`http://127.0.0.1:${server.port}/page`);
		expect(page.title).toBe("Hello");
	});
});
