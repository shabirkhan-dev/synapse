import { PDF_ERROR_CODES, type PdfTextExtractor } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";
import { extractText, getDocumentProxy } from "unpdf";

/** The text of each page, parsed with pdf.js (`unpdf`, no native code) in this thread. */
export async function extractPdfPages(bytes: Uint8Array): Promise<string[]> {
	let document: Awaited<ReturnType<typeof getDocumentProxy>>;
	try {
		// pdf.js takes ownership of the buffer it is given, so it gets a copy.
		document = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
	} catch (cause) {
		throw new SynapseError(PDF_ERROR_CODES.UNREADABLE, "The PDF could not be read", { cause });
	}
	try {
		const { text } = await extractText(document, { mergePages: false });
		return text;
	} finally {
		// Frees the parsed document (this pdf.js build has no `document.destroy()`).
		await document.loadingTask.destroy();
	}
}

/** Parses in the calling thread: for tests and batch tools, not for a server's request path. */
export function createPdfTextExtractor(): PdfTextExtractor {
	return { extract: async (bytes) => ({ pages: await extractPdfPages(bytes) }) };
}
