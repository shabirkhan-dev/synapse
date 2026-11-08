import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { convertArrayToReadableStream, MockEmbeddingModelV4, MockLanguageModelV4 } from "ai/test";
import { SignJWT } from "jose";

import { createAiSdkModelGateway } from "@synapse/adapters/model-gateway";
import { type AuditStore, createAuditLog, type StoredAuditEvent } from "@synapse/audit";
import type { EmailMessage, EmailSender } from "@synapse/core/contracts";
import type {
	AnswerFeedback,
	ApprovalRequest,
	ApprovalStore,
	Decision,
	FeedbackStore,
} from "@synapse/human-oversight";
import { MemorySaver } from "@synapse/orchestration";
import { redactPiiDeep } from "@synapse/security";
import type { KeywordSearchRequest, VectorSearchRequest } from "@synapse/retrieval";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import { createLogger, instrumentModelGateway } from "@synapse/observability";

import { createApp } from "@/app";
import { loadConfiguration } from "@/config";
import { developmentJwtSecret } from "@/config/env";
import {
	type AuthRepository,
	AuthService,
	type AuthSession,
	type AuthTokenPurpose,
	type RateLimiter,
	type RateLimitRule,
	type User,
	type UserCredentials,
} from "@/modules/auth";
import { ChatService } from "@/modules/chat";
import { OversightService } from "@/modules/oversight";
import {
	type NewRagChunk,
	type NewRagDocument,
	type RagDocument,
	type RagMatch,
	type RagRepository,
	RagService,
	registerRagActions,
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

	async deleteAllDocuments(ownerId: string): Promise<number> {
		const mine = this.documents.filter((d) => d.ownerId === ownerId);
		this.documents = this.documents.filter((d) => d.ownerId !== ownerId);
		this.chunks = this.chunks.filter((c) => c.ownerId !== ownerId);
		return mine.length;
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

type StoredSession = Omit<AuthSession, "matched"> & {
	refreshTokenHash: string;
	previousRefreshTokenHash: string | null;
};

export class InMemoryAuthRepository implements AuthRepository {
	users: UserCredentials[] = [];
	sessions: StoredSession[] = [];

	async createUser({ email, passwordHash }: { email: string; passwordHash: string }) {
		if (this.users.some((user) => user.email === email)) return null;
		const user = {
			id: crypto.randomUUID(),
			email,
			passwordHash,
			emailVerifiedAt: null as string | null,
			createdAt: new Date().toISOString(),
		};
		this.users.push(user);
		const { passwordHash: _passwordHash, ...publicUser } = user;
		return publicUser;
	}

	async findUserByEmail(email: string) {
		return this.users.find((user) => user.email === email) ?? null;
	}

	async findUserById(userId: string): Promise<User | null> {
		const found = this.users.find((user) => user.id === userId);
		if (!found) return null;
		const { passwordHash: _passwordHash, ...user } = found;
		return user;
	}

	async createSession(input: { userId: string; refreshTokenHash: string; expiresAt: Date }) {
		const session = {
			...input,
			id: crypto.randomUUID(),
			revokedAt: null,
			previousRefreshTokenHash: null,
		};
		this.sessions.push(session);
		return { id: session.id };
	}

	async findSessionByRefreshTokenHash(hash: string): Promise<AuthSession | null> {
		const session = this.sessions.find(
			(s) => s.refreshTokenHash === hash || s.previousRefreshTokenHash === hash,
		);
		if (!session) return null;
		return {
			id: session.id,
			userId: session.userId,
			expiresAt: session.expiresAt,
			revokedAt: session.revokedAt,
			matched: session.refreshTokenHash === hash ? "current" : "previous",
		};
	}

	async rotateRefreshToken({
		sessionId,
		currentHash,
		nextHash,
	}: {
		sessionId: string;
		currentHash: string;
		nextHash: string;
	}) {
		const session = this.sessions.find(
			(s) => s.id === sessionId && s.refreshTokenHash === currentHash && !s.revokedAt,
		);
		if (!session) return false;
		session.previousRefreshTokenHash = currentHash;
		session.refreshTokenHash = nextHash;
		return true;
	}

	async revokeSession({ sessionId, userId }: { sessionId: string; userId: string }) {
		for (const session of this.sessions) {
			if (session.id === sessionId && session.userId === userId) session.revokedAt ??= new Date();
		}
	}

	async revokeAllSessions(userId: string) {
		for (const session of this.sessions) {
			if (session.userId === userId) session.revokedAt ??= new Date();
		}
	}

	tokens: Array<{
		userId: string;
		purpose: AuthTokenPurpose;
		tokenHash: string;
		expiresAt: Date;
		usedAt: Date | null;
	}> = [];

	async replaceAuthToken(input: {
		userId: string;
		purpose: AuthTokenPurpose;
		tokenHash: string;
		expiresAt: Date;
	}) {
		for (const token of this.tokens) {
			if (token.userId === input.userId && token.purpose === input.purpose)
				token.usedAt ??= new Date();
		}
		this.tokens.push({ ...input, usedAt: null });
	}

	async consumeAuthToken({ purpose, tokenHash }: { purpose: AuthTokenPurpose; tokenHash: string }) {
		const token = this.tokens.find(
			(t) =>
				t.tokenHash === tokenHash && t.purpose === purpose && !t.usedAt && t.expiresAt > new Date(),
		);
		if (!token) return null;
		token.usedAt = new Date();
		return token.userId;
	}

	async markEmailVerified(userId: string) {
		const user = this.users.find((u) => u.id === userId);
		if (user) user.emailVerifiedAt ??= new Date().toISOString();
	}

	async updatePasswordHash({ userId, passwordHash }: { userId: string; passwordHash: string }) {
		const user = this.users.find((u) => u.id === userId);
		if (user) user.passwordHash = passwordHash;
	}
}

export class InMemoryApprovalStore implements ApprovalStore {
	rows: ApprovalRequest[] = [];

	async create(input: { id: string; ownerId: string; action: string; summary: string }) {
		if (this.rows.some((row) => row.id === input.id)) return;
		this.rows.push({
			...input,
			status: "pending",
			reason: null,
			decidedBy: null,
			decidedAt: null,
			createdAt: new Date().toISOString(),
		});
	}

	async find({ id, ownerId }: { id: string; ownerId: string }) {
		return this.rows.find((row) => row.id === id && row.ownerId === ownerId) ?? null;
	}

	async listPending(ownerId: string) {
		return this.rows.filter((row) => row.ownerId === ownerId && row.status === "pending");
	}

	async decide({
		id,
		ownerId,
		approved,
		decidedBy,
		reason,
	}: { id: string; ownerId: string } & Decision) {
		const row = this.rows.find(
			(r) => r.id === id && r.ownerId === ownerId && r.status === "pending",
		);
		if (!row) return null;
		Object.assign(row, {
			status: approved ? "approved" : "rejected",
			decidedBy,
			reason: reason ?? null,
			decidedAt: new Date().toISOString(),
		});
		return row;
	}
}

export class InMemoryFeedbackStore implements FeedbackStore {
	rows: AnswerFeedback[] = [];

	async upsert(input: Omit<AnswerFeedback, "createdAt">) {
		this.rows = this.rows.filter(
			(row) => !(row.ownerId === input.ownerId && row.requestId === input.requestId),
		);
		const row = { ...input, createdAt: new Date().toISOString() };
		this.rows.push(row);
		return row;
	}
}

export class InMemoryAuditStore implements AuditStore {
	events: StoredAuditEvent[] = [];

	async append(event: Omit<StoredAuditEvent, "id" | "createdAt">) {
		const stored = { ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
		this.events.push(stored);
		return stored;
	}

	async list({ ownerId, limit, action }: { ownerId: string; limit: number; action?: string }) {
		return this.events
			.filter((e) => e.ownerId === ownerId && (!action || e.action === action))
			.toReversed()
			.slice(0, limit);
	}
}

/** Same fixed-window rule as the Postgres limiter, in memory. */
export class InMemoryRateLimiter implements RateLimiter {
	private readonly windows = new Map<string, { startedAt: number; attempts: number }>();

	async hit(key: string, { limit, windowSeconds }: RateLimitRule) {
		const now = Date.now();
		const current = this.windows.get(key);
		const window =
			current && now - current.startedAt < windowSeconds * 1000
				? { ...current, attempts: current.attempts + 1 }
				: { startedAt: now, attempts: 1 };
		this.windows.set(key, window);
		const retryAfterSeconds = Math.max(
			1,
			Math.ceil((window.startedAt + windowSeconds * 1000 - now) / 1000),
		);
		return { allowed: window.attempts <= limit, retryAfterSeconds };
	}
}

/** Records every email instead of sending it. */
export class CapturingEmailSender implements EmailSender {
	sent: EmailMessage[] = [];

	async send(message: EmailMessage) {
		this.sent.push(message);
	}

	/** The `token` query parameter of the last link sent to `to`. */
	lastToken(to: string): string {
		const message = this.sent.findLast((m) => m.to === to);
		const token = message?.text.match(/[?&]token=([A-Za-z0-9_-]+)/)?.[1];
		if (!token) throw new Error(`No link emailed to ${to}`);
		return token;
	}
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
	authRepository = new InMemoryAuthRepository(),
	email = new CapturingEmailSender(),
	pingDatabase = async () => {},
	searchMode = testConfig.rag.searchMode,
}: {
	chatModel?: MockLanguageModelV4;
	embeddingModel?: MockEmbeddingModelV4;
	repository?: RagRepository;
	authRepository?: InMemoryAuthRepository;
	email?: CapturingEmailSender;
	pingDatabase?: () => Promise<void>;
	searchMode?: "vector" | "hybrid";
} = {}) {
	const logger = createLogger({ service: "test", level: "ERROR" });
	// Instrumented like server.ts, so tests exercise the same tracing path.
	const gateway = instrumentModelGateway(
		createAiSdkModelGateway({
			chatModel,
			embeddingModel,
			chatInfo: { provider: "mock", model: "mock-chat" },
			embeddingInfo: { provider: "mock", model: "mock-embedding" },
		}),
		{ logger },
	);
	const auditEvents = new InMemoryAuditStore();
	const audit = createAuditLog({ store: auditEvents, redact: redactPiiDeep });
	const rag = new RagService(repository, gateway, {
		chunk: testConfig.rag.chunk,
		defaultTopK: testConfig.rag.topK,
		searchMode,
		maxContextTokens: testConfig.rag.maxContextTokens,
		audit,
	});
	const chat = new ChatService({
		rag,
		chatModel,
		maxSteps: testConfig.rag.chatMaxSteps,
		topK: testConfig.rag.topK,
	});
	const auth = new AuthService({
		repository: authRepository,
		rateLimiter: new InMemoryRateLimiter(),
		email,
		logger,
		config: testConfig.auth,
		audit,
	});
	const approvals = new InMemoryApprovalStore();
	const feedback = new InMemoryFeedbackStore();
	const oversight = new OversightService(approvals, feedback, new MemorySaver(), audit);
	registerRagActions(oversight, rag);
	const app = createApp({
		config: testConfig,
		logger,
		auth,
		rag,
		oversight,
		audit,
		chat,
		pingDatabase,
	});
	return {
		app,
		rag,
		repository,
		authRepository,
		email,
		approvals,
		feedback,
		auditEvents,
		chatModel,
		embeddingModel,
	};
}

export async function authHeaders(sub = "user-1") {
	return {
		authorization: `Bearer ${await signAccessToken({ sub, sid: `session-${sub}` })}`,
		"content-type": "application/json",
	};
}
