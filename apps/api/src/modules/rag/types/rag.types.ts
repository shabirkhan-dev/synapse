import type { KeywordSearchRequest, VectorSearchRequest } from "@synapse/retrieval";

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
	/** Relevance, higher is better: cosine similarity (vector) or RRF score (hybrid). */
	score: number;
	/** 1-based rank in the vector and keyword lists that found this chunk. */
	ranks?: { vector?: number; keyword?: number };
};

/** Persistence port; the Drizzle implementation is DrizzleRagRepository, tests use an in-memory one. */
export interface RagRepository {
	createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument>;
	listDocuments(ownerId: string, limit: number): Promise<RagDocument[]>;
	findByContentHash(ownerId: string, contentHash: string): Promise<RagDocument | null>;
	deleteDocument(ownerId: string, documentId: string): Promise<boolean>;
	/** Nearest chunks by cosine similarity, only for the given embedding model (or legacy nulls). */
	searchChunks(request: VectorSearchRequest): Promise<RagMatch[]>;
	/** Full-text matches ranked by `ts_rank_cd`. */
	keywordSearch(request: KeywordSearchRequest): Promise<RagMatch[]>;
	ping(): Promise<void>;
}
