import type { RagDocumentRow } from "@synapse/database";

import type { RagDocument } from "../types/rag.types";

/** Database row → API/domain document (timestamps as ISO strings, owner id dropped). */
export function toRagDocument(row: RagDocumentRow): RagDocument {
	return {
		id: row.id,
		title: row.title,
		source: row.source,
		metadata: row.metadata,
		chunkCount: row.chunkCount,
		contentHash: row.contentHash,
		createdAt: row.createdAt.toISOString(),
	};
}
