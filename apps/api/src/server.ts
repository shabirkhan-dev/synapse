import { createOpenAICompatibleModelGateway } from "@synapse/adapters/model-gateway";
import { createDatabase } from "@synapse/database";

import { createApp } from "./app";
import { loadConfiguration } from "./config";
import { createLogger } from "./infrastructure/logger/logger";
import { ChatService } from "./modules/chat";
import { DrizzleRagRepository, RagService } from "./modules/rag";

const config = loadConfiguration();
const logger = createLogger({ prefix: config.app.serviceName, minLevel: config.app.logLevel });

if (!config.ai.apiKey) {
	logger.warn("AI_API_KEY is not set: ingest, query and chat will fail until it is configured.");
}

const database = createDatabase(config.database);
const repository = new DrizzleRagRepository(database.db);
const gateway = createOpenAICompatibleModelGateway(config.ai);
const rag = new RagService(repository, gateway, {
	chunk: config.rag.chunk,
	defaultTopK: config.rag.topK,
	searchMode: config.rag.searchMode,
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

logger.info(`listening on ${server.url.href.replace(/\/$/, "")}${config.app.basePath}`);
logger.info(`OpenAPI docs at ${server.url.href}${config.app.apiPrefix}/docs`);

async function shutdown(signal: string) {
	logger.info(`${signal} received, shutting down`);
	await server.stop();
	await database.close();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
