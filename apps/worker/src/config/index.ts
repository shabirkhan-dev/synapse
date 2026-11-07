import type { OpenAICompatibleGatewayOptions } from "@synapse/adapters/model-gateway";
import type { DatabaseOptions } from "@synapse/database";
import type { LogFormat, LogLevel } from "@synapse/observability";

import { type Env, parseEnv } from "./env";

export type WorkerConfiguration = {
	serviceName: string;
	logLevel: LogLevel;
	logFormat: LogFormat;
	database: DatabaseOptions;
	ai: OpenAICompatibleGatewayOptions;
	reembedBatchSize: number;
};

export function createConfiguration(env: Env): WorkerConfiguration {
	const embeddingApiKey = env.AI_EMBEDDING_API_KEY ?? env.AI_API_KEY;
	return {
		serviceName: env.SERVICE_NAME,
		logLevel: env.LOG_LEVEL,
		logFormat: env.LOG_FORMAT ?? (env.NODE_ENV === "production" ? "json" : "pretty"),
		database: {
			url: env.DATABASE_URL,
			poolMax: env.DATABASE_POOL_MAX,
			...(env.DATABASE_SSL ? { ssl: env.DATABASE_SSL === "true" } : {}),
		},
		ai: {
			providerName: env.AI_PROVIDER_NAME,
			baseUrl: env.AI_BASE_URL,
			...(env.AI_API_KEY ? { apiKey: env.AI_API_KEY } : {}),
			chatModel: env.AI_CHAT_MODEL,
			embedding: {
				model: env.AI_EMBEDDING_MODEL,
				...(env.AI_EMBEDDING_BASE_URL ? { baseUrl: env.AI_EMBEDDING_BASE_URL } : {}),
				...(embeddingApiKey ? { apiKey: embeddingApiKey } : {}),
			},
		},
		reembedBatchSize: env.WORKER_REEMBED_BATCH_SIZE,
	};
}

/** Parse the environment once at startup. Fails fast on bad config. */
export function loadConfiguration(
	source?: Record<string, string | undefined>,
): WorkerConfiguration {
	return createConfiguration(parseEnv(source));
}
