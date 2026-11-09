import { type ConfigSource, loadConfig } from "@synapse/core/config";
import {
	apiKeyFor,
	CHAT_PROVIDERS,
	EMBEDDING_PROVIDERS,
	PROVIDER_KEY_VARIABLES,
	providerCredentials,
} from "@synapse/providers";
import { z } from "zod";

/** Only what the worker needs: the database, embeddings and logging. */
export const envSchema = z
	.object({
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		SERVICE_NAME: z.string().min(1).default("synapse-worker"),
		LOG_LEVEL: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).default("INFO"),
		LOG_FORMAT: z.enum(["json", "pretty"]).optional(),
		DATABASE_URL: z.url().default("postgresql://synapse:synapse@localhost:5433/synapse"),
		DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
		DATABASE_SSL: z.enum(["true", "false"]).optional(),
		/** Same meaning as in the api (`openai-compatible` = AI_BASE_URL, or a direct vendor). */
		AI_CHAT_PROVIDER: z.enum(CHAT_PROVIDERS).default("openai-compatible"),
		AI_EMBEDDING_PROVIDER: z.enum(EMBEDDING_PROVIDERS).default("openai-compatible"),
		OPENAI_API_KEY: z.string().min(1).optional(),
		ANTHROPIC_API_KEY: z.string().min(1).optional(),
		GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
		COHERE_API_KEY: z.string().min(1).optional(),
		AI_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
		AI_PROVIDER_NAME: z.string().min(1).default("openrouter"),
		AI_API_KEY: z.string().min(1).optional(),
		AI_CHAT_MODEL: z.string().min(1).default("openai/gpt-4o-mini"),
		AI_EMBEDDING_BASE_URL: z.url().optional(),
		AI_EMBEDDING_API_KEY: z.string().min(1).optional(),
		AI_EMBEDDING_MODEL: z.string().min(1).default("openai/text-embedding-3-small"),
		/** Same meaning as in the api: per-attempt deadline, attempts, circuit breaker. */
		AI_CHAT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(60_000),
		AI_EMBEDDING_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(30_000),
		AI_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
		AI_CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().min(1).max(100).default(5),
		AI_CIRCUIT_RESET_MS: z.coerce.number().int().min(1000).max(3_600_000).default(30_000),
		/** Chunks embedded per call (and per checkpoint) when re-embedding. */
		WORKER_REEMBED_BATCH_SIZE: z.coerce.number().int().min(1).max(2048).default(100),
	})
	.superRefine((env, context) => {
		const provider = env.AI_EMBEDDING_PROVIDER;
		if (
			env.NODE_ENV === "production" &&
			!apiKeyFor(provider, providerCredentials(env), "embedding")
		) {
			context.addIssue({
				code: "custom",
				path: [PROVIDER_KEY_VARIABLES[provider]],
				message: `${PROVIDER_KEY_VARIABLES[provider]} is required in production (${provider} embeddings)`,
			});
		}
	});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: ConfigSource = process.env): Env {
	return loadConfig(envSchema, source);
}
