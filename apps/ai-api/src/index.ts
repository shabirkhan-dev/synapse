import { createLogger } from "@starter/logger";

import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createDatabase } from "./database/database";
import { createAiModels } from "./modules/ai/ai.provider";
import { DrizzleRagRepository } from "./modules/rag/rag.repository";
import { RagService } from "./modules/rag/rag.service";

const env = parseEnv();
const logger = createLogger({
	prefix: env.SERVICE_NAME,
	minLevel: env.LOG_LEVEL,
	useColors: env.NODE_ENV !== "production",
	isoTime: env.NODE_ENV === "production",
});

if (!env.AI_API_KEY) {
	logger.warn("AI_API_KEY is not set: ingest, query and chat will fail until it is configured.");
}

const database = createDatabase({
	url: env.DATABASE_URL,
	poolMax: env.DATABASE_POOL_MAX,
	...(env.DATABASE_SSL ? { ssl: env.DATABASE_SSL === "true" } : {}),
});
const repository = new DrizzleRagRepository(database.db);
const models = createAiModels(env);
const rag = new RagService(repository, models, {
	chunk: { size: env.RAG_CHUNK_SIZE, overlap: env.RAG_CHUNK_OVERLAP },
	defaultTopK: env.RAG_TOP_K,
});

const app = createApp({
	env,
	logger,
	rag,
	chatModel: models.chat,
	pingDatabase: () => repository.ping(),
});

const server = Bun.serve({
	port: env.PORT,
	fetch: app.fetch,
	// Streaming chat responses can stay open while tools run.
	idleTimeout: 120,
});

logger.info(
	`listening on ${server.url.href.replace(/\/$/, "")}/${env.API_PREFIX}/v${env.API_VERSION}`,
);
logger.info(`OpenAPI docs at ${server.url.href}${env.API_PREFIX}/docs`);

async function shutdown(signal: string) {
	logger.info(`${signal} received, shutting down`);
	await server.stop();
	await database.close();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
