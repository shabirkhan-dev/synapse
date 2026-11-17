import { describe, expect, test } from "bun:test";
import { WEB_PAGE_ERROR_CODES, type WebPageReader } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

import { authHeaders, buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
type Document = {
	id: string;
	title: string;
	source: string | null;
	metadata: Record<string, unknown>;
};

async function addUrl(app: App, body: unknown) {
	const response = await app.request("/api/v1/rag/documents/url", {
		method: "POST",
		headers: await authHeaders(),
		body: JSON.stringify(body),
	});
	return {
		status: response.status,
		body: (await response.json()) as { data: Document; error?: { code: string }; message: string },
	};
}

const page = {
	url: "https://example.com/refunds",
	title: "Refunds | Example",
	text: "# Refund policy\n\nRefunds are accepted within 30 days.\n\n## Exceptions\n\n- Gift cards",
	mediaType: "text/html",
};

/** A reader that answers from a table of pages, or with a refusal code. */
function fakeReader(
	pages: Record<string, typeof page | string>,
): WebPageReader & { reads: string[] } {
	const reads: string[] = [];
	return {
		reads,
		read: async (url) => {
			reads.push(url);
			const entry = pages[url];
			if (entry === undefined)
				throw new SynapseError(WEB_PAGE_ERROR_CODES.UNREACHABLE, "no such page");
			if (typeof entry === "string") throw new SynapseError(entry, "refused");
			return entry;
		},
	};
}

describe("POST /rag/documents/url", () => {
	test("a page is stored with its title, final address and metadata; its headings reach the chunks", async () => {
		const web = fakeReader({
			"https://example.com/r": { ...page, url: "https://example.com/refunds" },
		});
		const { app, auditEvents } = buildTestApp({ web });
		const added = await addUrl(app, { url: "https://example.com/r" });
		expect(added.status).toBe(201);
		expect(added.body.data).toMatchObject({
			title: "Refunds | Example",
			source: "https://example.com/refunds",
			metadata: { url: "https://example.com/refunds", mediaType: "text/html" },
		});
		expect(typeof added.body.data.metadata.fetchedAt).toBe("string");

		const detail = await app.request(`/api/v1/rag/documents/${added.body.data.id}`, {
			headers: await authHeaders(),
		});
		const chunks = ((await detail.json()) as { data: { chunks: { context: string | null }[] } })
			.data.chunks;
		expect(chunks.map((chunk) => chunk.context)).toContain(
			"Refunds | Example › Refund policy › Exceptions",
		);
		expect(auditEvents.events.some((event) => event.action === "rag.document.ingested")).toBe(true);

		// The same text again is the same document; a title given by the person wins.
		const again = await addUrl(app, { url: "https://example.com/r", title: "Mine" });
		expect(again.status).toBe(200);
		expect(again.body.data.id).toBe(added.body.data.id);
	});

	test("the reader's refusals become clear 4xx errors; nothing is stored", async () => {
		const web = fakeReader({
			"https://internal.example/": WEB_PAGE_ERROR_CODES.NOT_ALLOWED,
			"https://slow.example/": WEB_PAGE_ERROR_CODES.TIMEOUT,
			"https://big.example/": WEB_PAGE_ERROR_CODES.TOO_LARGE,
			"https://pdf.example/": WEB_PAGE_ERROR_CODES.UNSUPPORTED_TYPE,
			"https://loop.example/": WEB_PAGE_ERROR_CODES.TOO_MANY_REDIRECTS,
			"https://empty.example/": { ...page, text: "  " },
		});
		const { app } = buildTestApp({ web });
		const expected: Array<[string, number, string]> = [
			["https://internal.example/", 422, "RAG_URL_NOT_ALLOWED"],
			["https://slow.example/", 422, "RAG_URL_TIMED_OUT"],
			["https://big.example/", 422, "RAG_URL_TOO_LARGE"],
			["https://pdf.example/", 415, "RAG_URL_UNSUPPORTED"],
			["https://loop.example/", 422, "RAG_URL_UNREACHABLE"],
			["https://gone.example/", 422, "RAG_URL_UNREACHABLE"],
			["https://empty.example/", 422, "RAG_URL_HAS_NO_TEXT"],
		];
		for (const [url, status, code] of expected) {
			// oxlint-disable-next-line no-await-in-loop -- one at a time
			const reply = await addUrl(app, { url });
			expect([url, reply.status, reply.body.error?.code]).toEqual([url, status, code]);
		}
		const list = await app.request("/api/v1/rag/documents", { headers: await authHeaders() });
		expect(((await list.json()) as { data: unknown[] }).data).toHaveLength(0);
	});

	test("only http(s) addresses pass validation, before the reader is asked", async () => {
		const web = fakeReader({});
		const { app } = buildTestApp({ web });
		for (const url of [
			"file:///etc/passwd",
			"javascript:alert(1)",
			"ftp://example.com/a",
			"example.com",
			"",
		]) {
			// oxlint-disable-next-line no-await-in-loop
			expect((await addUrl(app, { url })).status).toBe(422);
		}
		expect(web.reads).toHaveLength(0);
	});

	test("the real reader refuses this machine's own addresses", async () => {
		const { app } = buildTestApp();
		for (const url of [
			"http://127.0.0.1/",
			"http://localhost:8000/api/v1/health",
			"http://169.254.169.254/",
		]) {
			// oxlint-disable-next-line no-await-in-loop
			const reply = await addUrl(app, { url });
			expect([url, reply.body.error?.code]).toEqual([url, "RAG_URL_NOT_ALLOWED"]);
		}
	});
});
