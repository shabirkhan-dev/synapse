import { PDF_ERROR_CODES, type PdfTextExtractor } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";
import { extractText, getDocumentProxy } from "unpdf";

/** PDF text with pdf.js (`unpdf`, no native code); runs in the calling process. */
export function createPdfTextExtractor(): PdfTextExtractor {
	return {
		async extract(bytes) {
			let document: Awaited<ReturnType<typeof getDocumentProxy>>;
			try {
				// pdf.js takes ownership of the buffer it is given, so it gets a copy.
				document = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
			} catch (cause) {
				throw new SynapseError(PDF_ERROR_CODES.UNREADABLE, "The PDF could not be read", { cause });
			}
			try {
				const { text } = await extractText(document, { mergePages: false });
				return { pages: text };
			} finally {
				// Frees the parsed document (this pdf.js build has no `document.destroy()`).
				await document.loadingTask.destroy();
			}
		},
	};
}
