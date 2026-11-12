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

/** One chunk as the document page shows it (never its vector). */
export type RagChunk = {
	id: string;
	chunkIndex: number;
	content: string;
	chunkerVersion: string | null;
	embeddingModel: string | null;
};

/** A document with one page of its chunks, in order, and the versions new chunks get today. */
export type RagDocumentDetail = RagDocument & {
	chunks: RagChunk[];
	/** Chunks before `offset` / after the page: page with `offset` + `limit`. */
	page: { offset: number; limit: number; total: number };
	current: { chunkerVersion: string; embeddingModel: string };
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
	ranks?: { vector?: number; keyword?: number; rerank?: number };
};

/** Persistence port; the Drizzle implementation is DrizzleRagRepository, tests use an in-memory one. */
export interface RagRepository {
	createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument>;
	listDocuments(ownerId: string, limit: number): Promise<RagDocument[]>;
	findByContentHash(ownerId: string, contentHash: string): Promise<RagDocument | null>;
	findDocument(ownerId: string, documentId: string): Promise<RagDocument | null>;
	/** The document's chunks ordered by index; owner-scoped like everything else. */
	listChunks(input: {
		ownerId: string;
		documentId: string;
		offset: number;
		limit: number;
	}): Promise<RagChunk[]>;
	deleteDocument(ownerId: string, documentId: string): Promise<boolean>;
	/** Delete every document (and chunk) of the owner; returns how many documents went. */
	deleteAllDocuments(ownerId: string): Promise<number>;
	/** Nearest chunks by cosine similarity, only for the given embedding model (or legacy nulls). */
	searchChunks(request: VectorSearchRequest): Promise<RagMatch[]>;
	/** Full-text matches ranked by `ts_rank_cd`. */
	keywordSearch(request: KeywordSearchRequest): Promise<RagMatch[]>;
	ping(): Promise<void>;
}
