import { WEB_PAGE_ERROR_CODES, type WebPage, type WebPageReader } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

import { htmlToText } from "./html-to-text";
import { createPublicRequest, type ResolveHost } from "./public-request";

export type { ResolveHost };

export type WebPageReaderOptions = {
	/** Whole read, redirects included. */
	timeoutMs?: number;
	/** Largest body read; bigger pages are refused. */
	maxBytes?: number;
	maxRedirects?: number;
	/**
	 * Development and tests only: allow private and loopback addresses and any port. Production
	 * config refuses it.
	 */
	allowPrivateNetworks?: boolean;
	/** Defaults to `Bun.dns.lookup`. */
	resolve?: ResolveHost;
	/** Defaults to the global `fetch`. */
	fetch?: typeof fetch;
};

const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const TEXT_TYPES = new Set(["text/plain", "text/markdown"]);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const USER_AGENT = "SynapseBot/1.0 (+document import)";

const fail = (code: string, message: string, retryable = false) =>
	new SynapseError(code, message, { retryable });

/**
 * Reads public web pages for ingestion, refusing anything that could reach inside the network
 * (SSRF): only http(s) on the default ports, no credentials in the URL, and every address the
 * host resolves to must be public. The connection then goes to that checked address (the host name
 * kept for `Host` and TLS), so the name cannot be re-resolved to an internal one in between (DNS
 * rebinding). Redirects are followed by hand, each one checked the same way.
 */
export function createWebPageReader({
	timeoutMs = 10_000,
	maxBytes = 2 * 1024 * 1024,
	maxRedirects = 5,
	allowPrivateNetworks = false,
	resolve,
	fetch: fetchImpl = fetch,
}: WebPageReaderOptions = {}): WebPageReader {
	const request = createPublicRequest({
		allowPrivateNetworks,
		resolve,
		fetch: fetchImpl,
		codes: {
			notAllowed: WEB_PAGE_ERROR_CODES.NOT_ALLOWED,
			unreachable: WEB_PAGE_ERROR_CODES.UNREACHABLE,
		},
	});

	async function readBody(response: Response): Promise<Uint8Array> {
		const declared = Number(response.headers.get("content-length") ?? 0);
		if (declared > maxBytes) throw tooLarge();
		if (!response.body) return new Uint8Array();
		const reader = response.body.getReader();
		const parts: Uint8Array[] = [];
		let size = 0;
		for (;;) {
			// oxlint-disable-next-line no-await-in-loop -- streaming read with a size cap
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxBytes) {
				await reader.cancel();
				throw tooLarge();
			}
			parts.push(value);
		}
		return Buffer.concat(parts);
	}

	const tooLarge = () =>
		fail(
			WEB_PAGE_ERROR_CODES.TOO_LARGE,
			`The page is larger than ${Math.round(maxBytes / 1024)} KiB`,
		);

	async function read(input: string, options: { signal?: AbortSignal } = {}): Promise<WebPage> {
		let url: URL;
		try {
			url = new URL(input);
		} catch {
			throw fail(WEB_PAGE_ERROR_CODES.NOT_ALLOWED, "That is not a web address");
		}
		const deadline = AbortSignal.timeout(timeoutMs);
		const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
		try {
			for (let hop = 0; hop <= maxRedirects; hop++) {
				// oxlint-disable-next-line no-await-in-loop -- each redirect is checked before following it
				const response = await request(url, {
					signal,
					headers: {
						"User-Agent": USER_AGENT,
						Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,text/markdown;q=0.9",
					},
				});
				if (REDIRECTS.has(response.status)) {
					const location = response.headers.get("location");
					await response.body?.cancel();
					if (!location)
						throw fail(WEB_PAGE_ERROR_CODES.UNREACHABLE, "A redirect without a location");
					url = new URL(location, url);
					continue;
				}
				if (!response.ok) {
					await response.body?.cancel();
					throw fail(
						WEB_PAGE_ERROR_CODES.UNREACHABLE,
						`The page answered ${response.status}`,
						response.status >= 500,
					);
				}
				const mediaType =
					(response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
				if (!HTML_TYPES.has(mediaType) && !TEXT_TYPES.has(mediaType)) {
					await response.body?.cancel();
					throw fail(
						WEB_PAGE_ERROR_CODES.UNSUPPORTED_TYPE,
						`Only web pages and plain text can be added (this is ${mediaType || "unknown"})`,
					);
				}
				// oxlint-disable-next-line no-await-in-loop
				const body = new TextDecoder().decode(await readBody(response));
				if (HTML_TYPES.has(mediaType)) {
					// oxlint-disable-next-line no-await-in-loop
					const page = await htmlToText(body);
					return { url: url.href, title: page.title, text: page.text, mediaType };
				}
				return { url: url.href, title: null, text: body.trim(), mediaType };
			}
			throw fail(WEB_PAGE_ERROR_CODES.TOO_MANY_REDIRECTS, `More than ${maxRedirects} redirects`);
		} catch (error) {
			if (error instanceof SynapseError) throw error;
			if (deadline.aborted) {
				throw fail(
					WEB_PAGE_ERROR_CODES.TIMEOUT,
					`The page took longer than ${timeoutMs / 1000} s`,
					true,
				);
			}
			if (options.signal?.aborted) throw error;
			throw fail(WEB_PAGE_ERROR_CODES.UNREACHABLE, "The page could not be reached", true);
		}
	}

	return { read };
}
