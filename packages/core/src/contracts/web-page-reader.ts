/** Codes a reader throws (as `SynapseError`) for pages it will not or cannot read. */
export const WEB_PAGE_ERROR_CODES = {
	/** Not http(s), a refused port, credentials in the URL, or a private / internal address. */
	NOT_ALLOWED: "WEB_PAGE_NOT_ALLOWED",
	/** DNS failure, refused connection, TLS error, or a non-2xx answer. */
	UNREACHABLE: "WEB_PAGE_UNREACHABLE",
	TIMEOUT: "WEB_PAGE_TIMEOUT",
	TOO_LARGE: "WEB_PAGE_TOO_LARGE",
	/** Not HTML or plain text (e.g. a PDF or an image). */
	UNSUPPORTED_TYPE: "WEB_PAGE_UNSUPPORTED_TYPE",
	TOO_MANY_REDIRECTS: "WEB_PAGE_TOO_MANY_REDIRECTS",
} as const;

export type WebPage = {
	/** Where the page was read from after redirects. */
	url: string;
	/** The page's `<title>` (or first heading), when it has one. */
	title: string | null;
	/** Readable text; HTML headings become Markdown headings, lists become `- ` lines. */
	text: string;
	mediaType: string;
};

/**
 * Reads one public web page as text. Implemented in `@synapse/adapters/web`, which refuses private
 * and internal addresses (SSRF), including after redirects.
 */
export interface WebPageReader {
	read(url: string, options?: { signal?: AbortSignal }): Promise<WebPage>;
}
