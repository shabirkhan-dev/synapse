import type { Env } from "./env";

/** Backoff before attempt 2 (doubling, full jitter), capped. Not tuned per deploy. */
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 4_000;

/** Timeouts, retries and circuit breakers for model and email calls (`@synapse/reliability`). */
export type ReliabilityConfig = {
	chatTimeoutMs: number;
	embeddingTimeoutMs: number;
	retry: { attempts: number; baseDelayMs: number; maxDelayMs: number };
	breaker: { failureThreshold: number; resetAfterMs: number };
};

export function createReliabilityConfig(env: Env): ReliabilityConfig {
	return {
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
	};
}
