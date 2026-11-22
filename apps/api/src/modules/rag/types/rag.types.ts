import type { DocumentAccess } from "@synapse/database";
import type { KeywordSearchRequest, VectorSearchRequest } from "@synapse/retrieval";

export type { DocumentAccess };

/**
 * Who reads documents: the organization (owner of the data), the user, and whether the user reads
 * every document there (`documents.read_all`: owners, admins). ADR-0008.
 */
export type RagReader =
	| { ownerId: string; userId: string; readsAll: boolean }
	/** No user (scripts, approved actions): every document of the owner. */
	| { ownerId: string; userId: null; readsAll: true };

export type NewRagDocument = {
	ownerId: string;
	title: string;
	source?: string | null;
	metadata?: Record<string, unknown>;
	/** SHA-256 of the normalized content; dedup key per owner. */
	contentHash?: string | null;
	/** Default `organization`. */
	access?: DocumentAccess;
	/** The user who added it. */
	createdBy?: string | null;
};

export type NewRagChunk = {
	chunkIndex: number;
	content: string;
	/** `Document title › headings` (chunker text-v2); embedded and keyword-indexed with the content. */
	context?: string | null;
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
	/** `organization` (every member) or `restricted` (creator, people it is shared with, admins). */
	access: DocumentAccess;
	/** Who added it; null for documents from before ADR-0008. */
	createdBy: string | null;
	createdAt: string;
};

/** One chunk as the document page shows it (never its vector). */
export type RagChunk = {
	id: string;
	chunkIndex: number;
	content: string;
	/** `Title › headings`; `null` on chunks from before text-v2. */
	context: string | null;
	chunkerVersion: string | null;
	embeddingModel: string | null;
};

/** A document with one page of its chunks, in order, and the versions new chunks get today. */
export type RagDocumentDetail = RagDocument & {
	chunks: RagChunk[];
	/** Chunks before `offset` / after the page: page with `offset` + `limit`. */
	page: { offset: number; limit: number; total: number };
	current: { chunkerVersion: string; embeddingModel: string };
	/** Users a restricted document is shared with (besides its creator, owners and admins). */
	sharedWith: string[];
	/** Whether this reader may change who can read it (its creator, owners, admins). */
	canManageAccess: boolean;
};

export type RagMatch = {
	chunkId: string;
	documentId: string;
	documentTitle: string;
	source: string | null;
	chunkIndex: number;
	content: string;
	/** `Title › headings` the chunk sits under; `null` on chunks from before text-v2. */
	context: string | null;
	/** Relevance, higher is better: cosine similarity (vector) or RRF score (hybrid). */
	score: number;
	/** 1-based rank in the vector and keyword lists that found this chunk. */
	ranks?: { vector?: number; keyword?: number; rerank?: number };
};

/** Persistence port; the Drizzle implementation is DrizzleRagRepository, tests use an in-memory one. */
export interface RagRepository {
	createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument>;
	/** Newest first, only the documents the reader may read. */
	listDocuments(reader: RagReader, limit: number, titleContains?: string): Promise<RagDocument[]>;
	/** Any document of the owner with this content, readable or not (dedup). */
	findByContentHash(ownerId: string, contentHash: string): Promise<RagDocument | null>;
	/** The document if it belongs to the reader's owner and the reader may read it. */
	findDocument(reader: RagReader, documentId: string): Promise<RagDocument | null>;
	/** The document's chunks ordered by index; owner-scoped like everything else. */
	listChunks(input: {
		ownerId: string;
		documentId: string;
		offset: number;
		limit: number;
	}): Promise<RagChunk[]>;
	/** Deletes it when the reader may read it; false otherwise (and when it does not exist). */
	deleteDocument(reader: RagReader, documentId: string): Promise<boolean>;
	/** Delete every document (and chunk) of the owner; returns how many documents went. */
	deleteAllDocuments(ownerId: string): Promise<number>;
	/** Nearest chunks by cosine similarity, only for the given embedding model (or legacy nulls). */
	searchChunks(request: VectorSearchRequest): Promise<RagMatch[]>;
	/** Full-text matches ranked by `ts_rank_cd`. */
	keywordSearch(request: KeywordSearchRequest): Promise<RagMatch[]>;
	/** Users a document is shared with. */
	listDocumentMembers(documentId: string): Promise<string[]>;
	/**
	 * Set who may read a document of the owner: the access level and, for `restricted`, the users
	 * it is shared with (non-members of the organization are dropped). Returns the users kept, or
	 * null when the document does not exist.
	 */
	setDocumentAccess(input: {
		ownerId: string;
		documentId: string;
		access: DocumentAccess;
		userIds: readonly string[];
	}): Promise<string[] | null>;
	ping(): Promise<void>;
}
