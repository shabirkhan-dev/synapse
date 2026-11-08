import { createPostgresCheckpointer } from "@synapse/adapters/checkpointer";
import { createAuditLog } from "@synapse/audit";
import { createOpenAICompatibleModelGateway } from "@synapse/adapters/model-gateway";
import { createDatabase } from "@synapse/database";
import { createLogger, instrumentModelGateway, startTracing } from "@synapse/observability";
import { redactPiiDeep } from "@synapse/security";

import { createApp } from "./app";
import { DrizzleAuditRepository } from "./modules/audit";
import { loadConfiguration } from "./config";
import { createEmailSender } from "./infrastructure/email/create-email-sender";
import { AuthService, DrizzleAuthRepository, DrizzleRateLimiter } from "./modules/auth";
import { ChatService } from "./modules/chat";
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

if (!config.ai.apiKey) {
	logger.warn("AI_API_KEY is not set: ingest, query and chat will fail until it is configured.");
}

const database = createDatabase(config.database);
const repository = new DrizzleRagRepository(database.db);
// Every answer, ingest, delete, sign-in and approval decision; PII is redacted before writing.
const audit = createAuditLog({
	store: new DrizzleAuditRepository(database.db),
	redact: redactPiiDeep,
});
const auth = new AuthService({
	repository: new DrizzleAuthRepository(database.db),
	rateLimiter: new DrizzleRateLimiter(database.db),
	email: createEmailSender(config.email, logger),
	logger,
	config: config.auth,
	audit,
});
const gateway = instrumentModelGateway(createOpenAICompatibleModelGateway(config.ai), {
	logger,
	prices: config.observability.modelPrices,
});
const rag = new RagService(repository, gateway, {
	chunk: config.rag.chunk,
	defaultTopK: config.rag.topK,
	searchMode: config.rag.searchMode,
	maxContextTokens: config.rag.maxContextTokens,
	audit,
});
const chat = new ChatService({
	rag,
	chatModel: gateway.chatModel,
	maxSteps: config.rag.chatMaxSteps,
	topK: config.rag.topK,
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
