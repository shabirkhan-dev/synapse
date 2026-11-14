import { PDF_ERROR_CODES, type PdfTextExtractor } from "@synapse/core/contracts";
import { isSynapseError } from "@synapse/core/errors";

/** File extensions we accept, and the media type each one means. */
export const FILE_MEDIA_TYPES = {
	".txt": "text/plain",
	".text": "text/plain",
	".md": "text/markdown",
	".markdown": "text/markdown",
	".pdf": "application/pdf",
} as const;

export type FileMediaType = (typeof FILE_MEDIA_TYPES)[keyof typeof FILE_MEDIA_TYPES];

export type UploadedFile = { name: string; bytes: Uint8Array };

export type FileExtraction =
	| {
			status: "extracted";
			/** The file name without its extension. */
			title: string;
			content: string;
			mediaType: FileMediaType;
			/** Page count for PDFs, null for text. */
			pages: number | null;
	  }
	/** Not a .txt, .md or .pdf, or the content does not match the name (e.g. binary `.txt`). */
	| { status: "unsupported" }
	/** Readable but without text, e.g. a scanned PDF or an empty file. */
	| { status: "no-text" }
	/** A PDF that is malformed or encrypted. */
	| { status: "unreadable" }
	/** A PDF that took longer than the reader allows (very large or pathological). */
	| { status: "timed-out" };

const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");

function startsWithPdfSignature(bytes: Uint8Array): boolean {
	return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function splitName(name: string): { title: string; extension: string } {
	const dot = name.lastIndexOf(".");
	return dot > 0
		? { title: name.slice(0, dot).trim(), extension: name.slice(dot).toLowerCase() }
		: { title: name.trim(), extension: "" };
}

/** Strict UTF-8 without NUL bytes, or null for anything that looks binary. */
function decodeText(bytes: Uint8Array): string | null {
	if (bytes.includes(0)) return null;
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}

/**
 * Text from an uploaded file. The type comes from the name and must match the bytes: a PDF needs
 * the `%PDF-` signature, text and Markdown must be valid UTF-8 (Markdown is kept as written).
 */
export async function extractFileText(
	file: UploadedFile,
	{ pdf }: { pdf: PdfTextExtractor },
): Promise<FileExtraction> {
	const { title, extension } = splitName(file.name);
	const mediaType: FileMediaType | undefined =
		FILE_MEDIA_TYPES[extension as keyof typeof FILE_MEDIA_TYPES];
	const isPdf = startsWithPdfSignature(file.bytes);
	if (!mediaType || isPdf !== (mediaType === "application/pdf")) return { status: "unsupported" };

	if (isPdf) {
		let pages: string[];
		try {
			({ pages } = await pdf.extract(file.bytes));
		} catch (error) {
			if (isSynapseError(error) && error.code === PDF_ERROR_CODES.UNREADABLE) {
				return { status: "unreadable" };
			}
			if (isSynapseError(error) && error.code === PDF_ERROR_CODES.TIMEOUT) {
				return { status: "timed-out" };
			}
			throw error;
		}
		const content = pages.join("\n\n");
		if (!content.trim()) return { status: "no-text" };
		return { status: "extracted", title, content, mediaType, pages: pages.length };
	}

	const content = decodeText(file.bytes);
	if (content === null) return { status: "unsupported" };
	if (!content.trim()) return { status: "no-text" };
	return { status: "extracted", title, content, mediaType, pages: null };
}
