/** Codes an extractor throws (as `SynapseError`) for files it cannot read. */
export const PDF_ERROR_CODES = { UNREADABLE: "PDF_UNREADABLE", TIMEOUT: "PDF_TIMEOUT" } as const;

/**
 * The text of a PDF, one string per page (empty for pages without a text layer, e.g. scans).
 * Implemented in `@synapse/adapters/pdf`. Throws `PDF_UNREADABLE` for a malformed or encrypted file
 * and `PDF_TIMEOUT` when parsing takes longer than allowed.
 */
export interface PdfTextExtractor {
	extract(bytes: Uint8Array): Promise<{ pages: string[] }>;
}
