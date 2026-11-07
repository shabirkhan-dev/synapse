import { createOpenAICompatibleModelGateway } from "@synapse/adapters/model-gateway";
import { createDatabase } from "@synapse/database";
import { createLogger, instrumentModelGateway, startTracing } from "@synapse/observability";

import { createApp } from "./app";
import { loadConfiguration } from "./config";
import { ChatService } from "./modules/chat";
import { DrizzleRagRepository, RagService } from "./modules/rag";

const config = loadConfiguration();
const tracing = startTracing({
	serviceName: config.app.serviceName,
	...(config.observability.otlpEndpoint ? { otlpEndpoint: config.observability.otlpEndpoint } : {}),
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
const gateway = instrumentModelGateway(createOpenAICompatibleModelGateway(config.ai), {
	logger,
	prices: config.observability.modelPrices,
});
const rag = new RagService(repository, gateway, {
	chunk: config.rag.chunk,
	defaultTopK: config.rag.topK,
	searchMode: config.rag.searchMode,
	maxContextTokens: config.rag.maxContextTokens,
});
const chat = new ChatService({
	rag,
	chatModel: gateway.chatModel,
	maxSteps: config.rag.chatMaxSteps,
	topK: config.rag.topK,
});

const app = createApp({ config, logger, rag, chat, pingDatabase: () => repository.ping() });

const server = Bun.serve({
	port: config.app.port,
	fetch: app.fetch,
	// Streaming chat responses can stay open while tools run.
	idleTimeout: 120,
});

logger.info("listening", {
	url: `${server.url.href.replace(/\/$/, "")}${config.app.basePath}`,
	docs: `${server.url.href}${config.app.apiPrefix}/docs`,
	tracesExportedTo: config.observability.otlpEndpoint ?? "none",
});

async function shutdown(signal: string) {
	logger.info("shutting down", { signal });
	await server.stop();
	await database.close();
	await tracing.shutdown();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
