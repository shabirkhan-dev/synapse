import { contentHash } from "../deduplication/content-hash";
import {
	type NormalizedDocument,
	normalizeDocument,
	type RawDocument,
} from "../normalization/normalize-document";

/** A normalized document ready to be indexed, scoped to its owner. */
export type IngestableDocument = NormalizedDocument & {
	ownerId: string;
	contentHash: string;
};

/**
 * What the pipeline needs from the outside world. The caller supplies storage lookup and
 * indexing (chunk + embed + store), so ingestion depends on no database or model SDK.
 */
export type IngestionPorts<TDocument> = {
	findByContentHash(ownerId: string, contentHash: string): Promise<TDocument | null>;
	index(document: IngestableDocument): Promise<TDocument>;
};

export type IngestResult<TDocument> =
	| { status: "created"; document: TDocument }
	| { status: "duplicate"; document: TDocument }
	| { status: "empty" };

/** normalize → hash → skip if the owner already has this content → index. */
export function createIngestionPipeline<TDocument>(ports: IngestionPorts<TDocument>) {
	return {
		async ingest(ownerId: string, input: RawDocument): Promise<IngestResult<TDocument>> {
			const normalized = normalizeDocument(input);
			if (normalized.content.length === 0) {
				return { status: "empty" };
			}
			const hash = contentHash(normalized.content);
			const existing = await ports.findByContentHash(ownerId, hash);
			if (existing) {
				return { status: "duplicate", document: existing };
			}
			const document = await ports.index({ ...normalized, ownerId, contentHash: hash });
			return { status: "created", document };
		},
	};
}

export type IngestionPipeline<TDocument> = ReturnType<typeof createIngestionPipeline<TDocument>>;
