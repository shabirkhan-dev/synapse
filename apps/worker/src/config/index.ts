import type { OpenAICompatibleGatewayOptions } from "@synapse/adapters/model-gateway";
import type { DatabaseOptions } from "@synapse/database";
import type { LogFormat, LogLevel } from "@synapse/observability";
import type { ModelReliabilityOptions } from "@synapse/reliability";

import { type Env, parseEnv } from "./env";

export type WorkerConfiguration = {
	serviceName: string;
	logLevel: LogLevel;
	logFormat: LogFormat;
	database: DatabaseOptions;
	ai: OpenAICompatibleGatewayOptions;
	reembedBatchSize: number;
	reliability: Pick<
		ModelReliabilityOptions,
		"chatTimeoutMs" | "embeddingTimeoutMs" | "retry" | "breaker"
	>;
};

/** Backoff before attempt 2 (doubling, full jitter), capped; same as the api. */
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 4_000;

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
		reliability: {
			chatTimeoutMs: env.AI_CHAT_TIMEOUT_MS,
			embeddingTimeoutMs: env.AI_EMBEDDING_TIMEOUT_MS,
			retry: {
				attempts: env.AI_RETRY_ATTEMPTS,
				baseDelayMs: RETRY_BASE_DELAY_MS,
				maxDelayMs: RETRY_MAX_DELAY_MS,
			},
			breaker: {
				failureThreshold: env.AI_CIRCUIT_FAILURE_THRESHOLD,
				resetAfterMs: env.AI_CIRCUIT_RESET_MS,
			},
		},
	};
}

/** Parse the environment once at startup. Fails fast on bad config. */
export function loadConfiguration(
	source?: Record<string, string | undefined>,
): WorkerConfiguration {
	return createConfiguration(parseEnv(source));
}
