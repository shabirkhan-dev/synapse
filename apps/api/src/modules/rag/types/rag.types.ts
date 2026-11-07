export type NewRagDocument = {
	ownerId: string;
	title: string;
	source?: string | null;
	metadata?: Record<string, unknown>;
	/** SHA-256 of the normalized content; dedup key per owner. */
	contentHash?: string | null;
};

export type NewRagChunk = {
	chunkIndex: number;
	content: string;
	embedding: number[];
	/** Chunker and embedding model that produced this chunk (`@synapse/knowledge`). */
	chunkerVersion?: string | null;
	embeddingModel?: string | null;
};

export type RagDocument = {
	id: string;
	title: string;
	source: string | null;
	metadata: Record<string, unknown>;
	chunkCount: number;
	contentHash: string | null;
	createdAt: string;
};

export type RagMatch = {
	chunkId: string;
	documentId: string;
	documentTitle: string;
	source: string | null;
	chunkIndex: number;
	content: string;
	/** Cosine similarity in [-1, 1]; higher is closer. */
	score: number;
};

/** Persistence port; the Drizzle implementation is DrizzleRagRepository, tests use an in-memory one. */
export interface RagRepository {
	createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument>;
	listDocuments(ownerId: string, limit: number): Promise<RagDocument[]>;
	findByContentHash(ownerId: string, contentHash: string): Promise<RagDocument | null>;
	deleteDocument(ownerId: string, documentId: string): Promise<boolean>;
	searchChunks(ownerId: string, embedding: number[], topK: number): Promise<RagMatch[]>;
	ping(): Promise<void>;
}
