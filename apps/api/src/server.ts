import { createPostgresCheckpointer } from "@synapse/adapters/checkpointer";
import { createAuditLog } from "@synapse/audit";
import { createDatabase } from "@synapse/database";
import { embeddingVersion } from "@synapse/knowledge";
import { createLongTermMemory } from "@synapse/memory";
import { createTokenCounter } from "@synapse/native";
import { createLogger, startTracing } from "@synapse/observability";
import { redactPiiDeep } from "@synapse/security";

import { createApp } from "./app";
import { DrizzleAuditRepository } from "./modules/audit";
import { loadConfiguration } from "./config";
import { createEmailSender } from "./infrastructure/email/create-email-sender";
import { createModelGateway, createReranker } from "./infrastructure/models/create-model-gateway";
import { AuthService, DrizzleAuthRepository, DrizzleRateLimiter } from "./modules/auth";
import { ChatService } from "./modules/chat";
import { GuardrailsService } from "./modules/guardrails";
import { DrizzleOrganizationRepository, OrganizationsService } from "./modules/organizations";
import {
	DrizzleConversationRepository,
	DrizzleFactRepository,
	MemoryService,
} from "./modules/memory";
import {
	DrizzleApprovalRepository,
	DrizzleFeedbackRepository,
	OversightService,
} from "./modules/oversight";
import { DrizzleRagRepository, RagService, registerRagActions } from "./modules/rag";

const config = loadConfiguration();
const tracing = startTracing({
	serviceName: config.app.serviceName,
	...(config.observability.traceExport
		? {
				otlpEndpoint: config.observability.traceExport.endpoint,
				otlpHeaders: config.observability.traceExport.headers,
			}
		: {}),
});
const logger = createLogger({
	service: config.app.serviceName,
	level: config.observability.logLevel,
	format: config.observability.logFormat,
});

for (const [use, spec] of [
	["chat", config.ai.chat],
	["embedding", config.ai.embedding],
] as const) {
	if (!spec.apiKey) {
		logger.warn(
			`no API key for ${use} (${spec.provider}): calls will fail until one is configured`,
		);
	}
}

const database = createDatabase(config.database);
const repository = new DrizzleRagRepository(database.db);
// Every answer, ingest, delete, sign-in and approval decision; PII is redacted before writing.
const audit = createAuditLog({
	store: new DrizzleAuditRepository(database.db),
	redact: redactPiiDeep,
});
const guardrails = new GuardrailsService(config.guardrails, audit);
const authRepository = new DrizzleAuthRepository(database.db);
const organizations = new OrganizationsService({
	store: new DrizzleOrganizationRepository(database.db),
	findUserIdByEmail: async (email) => (await authRepository.findUserByEmail(email))?.id ?? null,
	audit,
});
const auth = new AuthService({
	repository: authRepository,
	rateLimiter: new DrizzleRateLimiter(database.db),
	email: createEmailSender(config.email, config.reliability, logger),
	logger,
	config: config.auth,
	audit,
	roleOf: (organizationId, userId) => organizations.roleOf(organizationId, userId),
});
const gateway = createModelGateway(config, logger);
// Rust BPE tokenizer when its binding is built for this platform, else the ~4 chars/token estimate.
const tokens = createTokenCounter();
logger.info("token counting", { tokenizer: tokens.tokenizer, native: tokens.native });
const reranker = createReranker(config, logger);
const rag = new RagService(repository, gateway, {
	chunk: config.rag.chunk,
	defaultTopK: config.rag.topK,
	searchMode: config.rag.searchMode,
	maxContextTokens: config.rag.maxContextTokens,
	countTokens: tokens.count,
	audit,
	guardrails,
	...(reranker
		? {
				rerank: {
					reranker,
					candidates: config.rag.rerankCandidates,
					onError: (error: unknown) =>
						logger.warn("rerank failed: using the fused order", { error }),
				},
			}
		: {}),
});
const memory = new MemoryService({
	conversations: new DrizzleConversationRepository(database.db),
	facts: createLongTermMemory({
		store: new DrizzleFactRepository(database.db),
		embedding: gateway.embedding,
		embeddingModel: embeddingVersion(gateway.embedding.info),
	}),
	audit,
	history: { ...config.rag.chatHistory, countTokens: tokens.count },
	guardrails,
});
const chat = new ChatService({
	rag,
	memory,
	guardrails,
	chatModel: gateway.chatModel,
	maxSteps: config.rag.chatMaxSteps,
	topK: config.rag.topK,
	logger,
});

// Paused approval runs live in Postgres, so a decision can resume them after a restart.
const checkpointer = createPostgresCheckpointer({ connectionString: config.database.url });
await checkpointer.setup();
const oversight = new OversightService(
	new DrizzleApprovalRepository(database.db),
	new DrizzleFeedbackRepository(database.db),
	checkpointer.saver,
	audit,
);
registerRagActions(oversight, rag);

const app = createApp({
	config,
	logger,
	auth,
	rag,
	oversight,
	audit,
	memory,
	organizations,
	chat,
	pingDatabase: () => repository.ping(),
});

const server = Bun.serve({
	port: config.app.port,
	fetch: app.fetch,
	// Streaming chat responses can stay open while tools run.
	idleTimeout: 120,
});

logger.info("listening", {
	url: `${server.url.href.replace(/\/$/, "")}${config.app.basePath}`,
	docs: `${server.url.href}${config.app.apiPrefix}/docs`,
	tracesExportedTo: config.observability.traceExport?.destination ?? "none",
});

async function shutdown(signal: string) {
	logger.info("shutting down", { signal });
	await server.stop();
	await checkpointer.close();
	await database.close();
	await tracing.shutdown();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
