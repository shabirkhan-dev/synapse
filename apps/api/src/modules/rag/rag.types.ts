export type NewRagDocument = {
	ownerId: string;
	title: string;
	source?: string | null;
	metadata?: Record<string, unknown>;
};

export type NewRagChunk = {
	chunkIndex: number;
	content: string;
	embedding: number[];
};

export type RagDocument = {
	id: string;
	title: string;
	source: string | null;
	metadata: Record<string, unknown>;
	chunkCount: number;
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

/** Persistence port; the drizzle implementation lives in rag.repository.ts, tests use an in-memory one. */
export interface RagRepository {
	createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument>;
	listDocuments(ownerId: string, limit: number): Promise<RagDocument[]>;
	deleteDocument(ownerId: string, documentId: string): Promise<boolean>;
	searchChunks(ownerId: string, embedding: number[], topK: number): Promise<RagMatch[]>;
	ping(): Promise<void>;
}
