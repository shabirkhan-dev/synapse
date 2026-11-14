import { PDF_ERROR_CODES, type PdfTextExtractor } from "@synapse/core/contracts";
import { isSynapseError, SynapseError } from "@synapse/core/errors";

import { extractPdfPages } from "./unpdf";

type Request = { bytes: Uint8Array };
type Reply = { ok: true; pages: string[] } | { ok: false; code: string; message: string };

/**
 * The worker side: call it from the worker's entry file (`new Worker(url)` loads that file). It
 * answers one `{ bytes }` message with the pages or the error code.
 */
export function servePdfExtraction(): void {
	const scope = globalThis as unknown as Worker;
	scope.addEventListener("message", async (event: MessageEvent<Request>) => {
		let reply: Reply;
		try {
			reply = { ok: true, pages: await extractPdfPages(event.data.bytes) };
		} catch (error) {
			reply = {
				ok: false,
				code: isSynapseError(error) ? error.code : PDF_ERROR_CODES.UNREADABLE,
				message: error instanceof Error ? error.message : "The PDF could not be read",
			};
		}
		// A worker's postMessage has no target origin (that is `window.postMessage`).
		// oxlint-disable-next-line unicorn/require-post-message-target-origin
		scope.postMessage(reply);
	});
}

export type WorkerPdfTextExtractorOptions = {
	/** The worker entry file that calls `servePdfExtraction()`. */
	workerUrl: string | URL;
	/** The worker is terminated after this long and the file is reported as too slow. */
	timeoutMs: number;
};

/**
 * Parses each PDF in its own worker thread, so a slow or hostile file cannot block the server; the
 * worker is terminated at the deadline (`PDF_TIMEOUT`) or when it is done. A crash is `PDF_UNREADABLE`.
 */
export function createWorkerPdfTextExtractor({
	workerUrl,
	timeoutMs,
}: WorkerPdfTextExtractorOptions): PdfTextExtractor {
	return {
		extract: (bytes) =>
			new Promise((resolve, reject) => {
				const worker = new Worker(workerUrl);
				const finish = (settle: () => void) => {
					clearTimeout(timer);
					worker.terminate();
					settle();
				};
				const timer = setTimeout(
					() =>
						finish(() =>
							reject(
								new SynapseError(
									PDF_ERROR_CODES.TIMEOUT,
									`The PDF took longer than ${timeoutMs} ms to read`,
								),
							),
						),
					timeoutMs,
				);
				worker.addEventListener("message", (event: MessageEvent<Reply>) => {
					const reply = event.data;
					finish(() =>
						reply.ok
							? resolve({ pages: reply.pages })
							: reject(new SynapseError(reply.code, reply.message)),
					);
				});
				worker.addEventListener("error", (event) =>
					finish(() =>
						reject(
							new SynapseError(PDF_ERROR_CODES.UNREADABLE, "The PDF reader stopped", {
								cause: event.message,
							}),
						),
					),
				);
				// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker, not a window
				worker.postMessage({ bytes: new Uint8Array(bytes) });
			}),
	};
}
