/** A document as it arrives from a source, before any cleanup. */
export type RawDocument = {
	title: string;
	content: string;
	source?: string | null | undefined;
	metadata?: Record<string, unknown> | undefined;
};

/** The canonical shape every later stage (dedup, chunking, indexing) works on. */
export type NormalizedDocument = {
	title: string;
	content: string;
	source: string | null;
	metadata: Record<string, unknown>;
};

/** Zero-width space, zero-width (non-)joiner and byte-order mark. */
const INVISIBLE_CHARACTERS = new RegExp("[\\u200B-\\u200D\\uFEFF]", "g");

/**
 * Clean text so equivalent inputs compare equal: Unicode NFC, `\n` line endings, no NUL or
 * zero-width characters, no trailing spaces, at most one blank line in a row, trimmed.
 */
export function normalizeText(text: string): string {
	return text
		.normalize("NFC")
		.replace(/\r\n?/g, "\n")
		.replaceAll("\u0000", "")
		.replace(INVISIBLE_CHARACTERS, "")
		.replace(/[ \t]+$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function normalizeDocument(input: RawDocument): NormalizedDocument {
	const source = input.source?.trim();
	return {
		title: normalizeText(input.title).replace(/\s+/g, " "),
		content: normalizeText(input.content),
		source: source ? source : null,
		metadata: input.metadata ?? {},
	};
}
