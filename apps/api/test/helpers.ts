import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { convertArrayToReadableStream, MockEmbeddingModelV4, MockLanguageModelV4 } from "ai/test";
import { SignJWT } from "jose";

import { createAiSdkModelGateway } from "@synapse/adapters/model-gateway";
import type { KeywordSearchRequest, VectorSearchRequest } from "@synapse/retrieval";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";

import { createApp } from "@/app";
import { loadConfiguration } from "@/config";
import { developmentJwtSecret } from "@/config/env";
import { createLogger } from "@/infrastructure/logger/logger";
import { ChatService } from "@/modules/chat";
import {
	type NewRagChunk,
	type NewRagDocument,
	type RagDocument,
	type RagMatch,
	type RagRepository,
	RagService,
} from "@/modules/rag";

export const testConfig = loadConfiguration({
	NODE_ENV: "test",
	LOG_LEVEL: "ERROR",
	RAG_CHUNK_SIZE: "200",
	RAG_CHUNK_OVERLAP: "20",
});

export const usage = {
	inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
	outputTokens: { total: 5, text: 5, reasoning: undefined },
};

/** Deterministic bag-of-words embedding: texts sharing words get high cosine similarity. */
export function fakeEmbedding(text: string): number[] {
	const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
	for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
		let hash = 0;
		for (const char of word) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
		const index = hash % EMBEDDING_DIMENSIONS;
		vector[index] = (vector[index] ?? 0) + 1;
	}
	const norm = Math.hypot(...vector) || 1;
	return vector.map((value) => value / norm);
}

export function createMockEmbeddingModel() {
	return new MockEmbeddingModelV4({
		maxEmbeddingsPerCall: 100,
		doEmbed: async ({ values }) => ({
			embeddings: values.map((value) => fakeEmbedding(String(value))),
			usage: { tokens: values.length },
			warnings: [],
		}),
	});
}

export function textGenerateResult(text: string) {
	return {
		content: [{ type: "text" as const, text }],
		finishReason: { unified: "stop" as const, raw: "stop" },
		usage,
		warnings: [],
	};
}

export function streamResult(parts: LanguageModelV4StreamPart[]) {
	return { stream: convertArrayToReadableStream(parts) };
}

export function textStreamParts(text: string, id = "text-1"): LanguageModelV4StreamPart[] {
	return [
		{ type: "stream-start", warnings: [] },
		{ type: "text-start", id },
		{ type: "text-delta", id, delta: text },
		{ type: "text-end", id },
		{ type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage },
	];
}

export function toolCallStreamParts(
	toolName: string,
	input: unknown,
	toolCallId = "call-1",
): LanguageModelV4StreamPart[] {
	return [
		{ type: "stream-start", warnings: [] },
		{ type: "tool-call", toolCallId, toolName, input: JSON.stringify(input) },
		{ type: "finish", finishReason: { unified: "tool-calls", raw: "tool_calls" }, usage },
	];
}

export class InMemoryRagRepository implements RagRepository {
	documents: Array<RagDocument & { ownerId: string }> = [];
	chunks: Array<NewRagChunk & { id: string; documentId: string; ownerId: string }> = [];

	async createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument> {
		const stored = {
			id: crypto.randomUUID(),
			ownerId: document.ownerId,
			title: document.title,
			source: document.source ?? null,
			metadata: document.metadata ?? {},
			chunkCount: chunks.length,
			contentHash: document.contentHash ?? null,
			createdAt: new Date().toISOString(),
		};
		this.documents.push(stored);
		for (const chunk of chunks) {
			this.chunks.push({
				...chunk,
				id: crypto.randomUUID(),
				documentId: stored.id,
				ownerId: document.ownerId,
			});
		}
		const { ownerId: _ownerId, ...publicDocument } = stored;
		return publicDocument;
	}

	async listDocuments(ownerId: string, limit: number): Promise<RagDocument[]> {
		return this.documents
			.filter((document) => document.ownerId === ownerId)
			.slice(-limit)
			.toReversed()
			.map(({ ownerId: _ownerId, ...document }) => document);
	}

	async findByContentHash(ownerId: string, contentHash: string): Promise<RagDocument | null> {
		const found = this.documents.find(
			(document) => document.ownerId === ownerId && document.contentHash === contentHash,
		);
		if (!found) return null;
		const { ownerId: _ownerId, ...document } = found;
		return document;
	}

	async deleteDocument(ownerId: string, documentId: string): Promise<boolean> {
		const before = this.documents.length;
		this.documents = this.documents.filter((d) => !(d.id === documentId && d.ownerId === ownerId));
		this.chunks = this.chunks.filter(
			(c) => !(c.documentId === documentId && c.ownerId === ownerId),
		);
		return this.documents.length < before;
	}

	async searchChunks({
		ownerId,
		embedding,
		embeddingModel,
		limit,
	}: VectorSearchRequest): Promise<RagMatch[]> {
		return this.chunks
			.filter(
				(chunk) =>
					chunk.ownerId === ownerId &&
					(chunk.embeddingModel == null || chunk.embeddingModel === embeddingModel),
			)
			.map((chunk) =>
				this.toMatch(
					chunk,
					chunk.embedding.reduce((sum, value, index) => sum + value * (embedding[index] ?? 0), 0),
				),
			)
			.toSorted((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	/** Stand-in for Postgres full-text: count of query words present in the chunk. */
	async keywordSearch({ ownerId, query, limit }: KeywordSearchRequest): Promise<RagMatch[]> {
		const words = query.toLowerCase().match(/[a-z0-9-]+/g) ?? [];
		return this.chunks
			.filter((chunk) => chunk.ownerId === ownerId)
			.map((chunk) => {
				const text = chunk.content.toLowerCase();
				return this.toMatch(chunk, words.filter((word) => text.includes(word)).length);
			})
			.filter((match) => match.score > 0)
			.toSorted((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	private toMatch(
		chunk: NewRagChunk & { id: string; documentId: string },
		score: number,
	): RagMatch {
		const document = this.documents.find((d) => d.id === chunk.documentId);
		return {
			chunkId: chunk.id,
			documentId: chunk.documentId,
			documentTitle: document?.title ?? "",
			source: document?.source ?? null,
			chunkIndex: chunk.chunkIndex,
			content: chunk.content,
			score,
		};
	}

	async ping(): Promise<void> {}
}

export async function signAccessToken(
	claims: { sub?: string; sid?: string } = { sub: "user-1", sid: "session-1" },
	{
		secret = developmentJwtSecret,
		expiresIn = "15m",
	}: { secret?: string; expiresIn?: string } = {},
) {
	const jwt = new SignJWT(claims.sid ? { sid: claims.sid } : {})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuedAt()
		.setExpirationTime(expiresIn);
	if (claims.sub) jwt.setSubject(claims.sub);
	return jwt.sign(new TextEncoder().encode(secret));
}

export function buildTestApp({
	chatModel = new MockLanguageModelV4({ doGenerate: textGenerateResult("mock answer") }),
	embeddingModel = createMockEmbeddingModel(),
	repository = new InMemoryRagRepository(),
	pingDatabase = async () => {},
	searchMode = testConfig.rag.searchMode,
}: {
	chatModel?: MockLanguageModelV4;
	embeddingModel?: MockEmbeddingModelV4;
	repository?: RagRepository;
	pingDatabase?: () => Promise<void>;
	searchMode?: "vector" | "hybrid";
} = {}) {
	const gateway = createAiSdkModelGateway({
		chatModel,
		embeddingModel,
		chatInfo: { provider: "mock", model: "mock-chat" },
		embeddingInfo: { provider: "mock", model: "mock-embedding" },
	});
	const rag = new RagService(repository, gateway, {
		chunk: testConfig.rag.chunk,
		defaultTopK: testConfig.rag.topK,
		searchMode,
		maxContextTokens: testConfig.rag.maxContextTokens,
	});
	const chat = new ChatService({
		rag,
		chatModel,
		maxSteps: testConfig.rag.chatMaxSteps,
		topK: testConfig.rag.topK,
	});
	const app = createApp({
		config: testConfig,
		logger: createLogger({ minLevel: "ERROR" }),
		rag,
		chat,
		pingDatabase,
	});
	return { app, rag, repository, chatModel, embeddingModel };
}

export async function authHeaders(sub = "user-1") {
	return {
		authorization: `Bearer ${await signAccessToken({ sub, sid: `session-${sub}` })}`,
		"content-type": "application/json",
	};
}
