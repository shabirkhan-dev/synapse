import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { createLogger } from "@starter/logger";
import { convertArrayToReadableStream, MockEmbeddingModelV4, MockLanguageModelV4 } from "ai/test";
import { SignJWT } from "jose";

import { createApp } from "@/app";
import { developmentJwtSecret, parseEnv } from "@/config/env";
import { EMBEDDING_DIMENSIONS } from "@/database/schema";
import { RagService } from "@/modules/rag/rag.service";
import type {
	NewRagChunk,
	NewRagDocument,
	RagDocument,
	RagMatch,
	RagRepository,
} from "@/modules/rag/rag.types";

export const testEnv = parseEnv({
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

	async deleteDocument(ownerId: string, documentId: string): Promise<boolean> {
		const before = this.documents.length;
		this.documents = this.documents.filter((d) => !(d.id === documentId && d.ownerId === ownerId));
		this.chunks = this.chunks.filter(
			(c) => !(c.documentId === documentId && c.ownerId === ownerId),
		);
		return this.documents.length < before;
	}

	async searchChunks(ownerId: string, embedding: number[], topK: number): Promise<RagMatch[]> {
		return this.chunks
			.filter((chunk) => chunk.ownerId === ownerId)
			.map((chunk) => {
				const document = this.documents.find((d) => d.id === chunk.documentId);
				return {
					chunkId: chunk.id,
					documentId: chunk.documentId,
					documentTitle: document?.title ?? "",
					source: document?.source ?? null,
					chunkIndex: chunk.chunkIndex,
					content: chunk.content,
					score: chunk.embedding.reduce(
						(sum, value, index) => sum + value * (embedding[index] ?? 0),
						0,
					),
				};
			})
			.toSorted((a, b) => b.score - a.score)
			.slice(0, topK);
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
}: {
	chatModel?: MockLanguageModelV4;
	embeddingModel?: MockEmbeddingModelV4;
	repository?: RagRepository;
	pingDatabase?: () => Promise<void>;
} = {}) {
	const rag = new RagService(
		repository,
		{ chat: chatModel, embedding: embeddingModel },
		{
			chunk: { size: testEnv.RAG_CHUNK_SIZE, overlap: testEnv.RAG_CHUNK_OVERLAP },
			defaultTopK: testEnv.RAG_TOP_K,
		},
	);
	const app = createApp({
		env: testEnv,
		logger: createLogger({ minLevel: "ERROR", useColors: false }),
		rag,
		chatModel,
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
