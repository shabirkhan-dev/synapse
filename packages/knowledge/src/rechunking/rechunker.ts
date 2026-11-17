import type { ChunkPreparer, PreparedChunks } from "../embeddings/prepare-chunks";
import { chunkingOf, reassembleChunks } from "./reassemble";

/** Progress saved after every document, so a crashed run resumes where it stopped. */
export type RechunkCheckpoint = { afterDocumentId: string | null; rechunked: number };

export type RechunkPorts = {
	/**
	 * Documents with chunks from a chunker before text-v2 (their chunks still hold the headings, so
	 * the text can be rebuilt), ordered by id, after `afterDocumentId`.
	 */
	staleDocuments(input: {
		afterDocumentId: string | null;
		limit: number;
	}): Promise<Array<{ id: string; title: string }>>;
	/** The document's chunks in order, with the chunker that wrote them. */
	chunksOf(documentId: string): Promise<Array<{ content: string; chunkerVersion: string | null }>>;
	/** Swap the document's chunks for the new ones in one transaction. */
	replaceChunks(documentId: string, prepared: PreparedChunks): Promise<void>;
	loadCheckpoint(): Promise<RechunkCheckpoint | null>;
	saveCheckpoint(checkpoint: RechunkCheckpoint): Promise<void>;
};

export type RechunkerOptions = {
	preparer: ChunkPreparer;
	ports: RechunkPorts;
	/** Overlap to assume for chunks whose version does not record one. */
	defaultOverlap: number;
	batchSize?: number;
};

/**
 * Re-chunk documents written by an older chunker with the current one: rebuild each document's
 * text from its overlapping chunks, chunk and embed it again (headings become context), and swap
 * the chunks per document. Checkpointed after every document; a second run finds nothing to do.
 */
export function createRechunker({
	preparer,
	ports,
	defaultOverlap,
	batchSize = 20,
}: RechunkerOptions) {
	return {
		async run(): Promise<{ rechunked: number; chunkerVersion: string }> {
			let checkpoint = (await ports.loadCheckpoint()) ?? { afterDocumentId: null, rechunked: 0 };
			for (;;) {
				// oxlint-disable-next-line no-await-in-loop -- pages depend on the checkpoint
				const documents = await ports.staleDocuments({
					afterDocumentId: checkpoint.afterDocumentId,
					limit: batchSize,
				});
				if (documents.length === 0) {
					return { rechunked: checkpoint.rechunked, chunkerVersion: preparer.chunkerVersion };
				}
				for (const document of documents) {
					// oxlint-disable-next-line no-await-in-loop -- one document at a time, each checkpointed
					const chunks = await ports.chunksOf(document.id);
					const overlap = chunkingOf(chunks[0]?.chunkerVersion ?? null)?.overlap ?? defaultOverlap;
					const text = reassembleChunks(
						chunks.map((chunk) => chunk.content),
						overlap,
					);
					// oxlint-disable-next-line no-await-in-loop
					const prepared = await preparer.prepare(text, { title: document.title });
					// oxlint-disable-next-line no-await-in-loop
					if (prepared) await ports.replaceChunks(document.id, prepared);
					checkpoint = {
						afterDocumentId: document.id,
						rechunked: checkpoint.rechunked + (prepared ? 1 : 0),
					};
					// oxlint-disable-next-line no-await-in-loop
					await ports.saveCheckpoint(checkpoint);
				}
			}
		},
	};
}
