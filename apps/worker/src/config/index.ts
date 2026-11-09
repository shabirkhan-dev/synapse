import type { ModelGatewayOptions } from "@synapse/adapters/model-gateway";
import { type DatabaseOptions, EMBEDDING_DIMENSIONS } from "@synapse/database";
import type { LogFormat, LogLevel } from "@synapse/observability";
import {
	providerCredentials,
	resolveChatModelSpec,
	resolveEmbeddingModelSpec,
} from "@synapse/providers";
import type { ModelReliabilityOptions } from "@synapse/reliability";

import { type Env, parseEnv } from "./env";

export type WorkerConfiguration = {
	serviceName: string;
	logLevel: LogLevel;
	logFormat: LogFormat;
	database: DatabaseOptions;
	ai: ModelGatewayOptions;
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
	const credentials = providerCredentials(env);
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
			chat: resolveChatModelSpec(env.AI_CHAT_PROVIDER, env.AI_CHAT_MODEL, credentials),
			embedding: resolveEmbeddingModelSpec(
				env.AI_EMBEDDING_PROVIDER,
				env.AI_EMBEDDING_MODEL,
				credentials,
				EMBEDDING_DIMENSIONS,
			),
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
