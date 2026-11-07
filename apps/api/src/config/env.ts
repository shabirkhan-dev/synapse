import { z } from "@hono/zod-openapi";
import { type ConfigSource, loadConfig } from "@synapse/core/config";

/** Development-only default; production rejects it. */
export const developmentJwtSecret = "development-only-jwt-secret-change-me";

const booleanFromString = z
	.enum(["true", "false"])
	.default("false")
	.transform((value) => value === "true");

export const envSchema = z
	.object({
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		PORT: z.coerce.number().int().positive().default(8000),
		API_PREFIX: z.string().min(1).default("api"),
		API_VERSION: z.string().regex(/^\d+$/).default("1"),
		SERVICE_NAME: z.string().min(1).default("synapse-api"),
		LOG_LEVEL: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).default("INFO"),
		/** Postgres with the pgvector extension (docker compose uses pgvector/pgvector:pg18). */
		DATABASE_URL: z.url().default("postgresql://synapse:synapse@localhost:5433/synapse"),
		DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
		DATABASE_SSL: z.enum(["true", "false"]).optional(),
		/** Access tokens are HS256 JWTs signed with this secret. */
		JWT_SECRET: z.string().min(32).default(developmentJwtSecret),
		CORS_ORIGIN: z.string().min(1).default("http://localhost:3000,http://127.0.0.1:3000"),
		/** Any OpenAI-compatible endpoint. Defaults to OpenRouter. */
		AI_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),
		AI_PROVIDER_NAME: z.string().min(1).default("openrouter"),
		AI_API_KEY: z.string().min(1).optional(),
		AI_CHAT_MODEL: z.string().min(1).default("openai/gpt-4o-mini"),
		/** Optional separate endpoint for embeddings (e.g. OpenAI directly); falls back to AI_BASE_URL. */
		AI_EMBEDDING_BASE_URL: z.url().optional(),
		AI_EMBEDDING_API_KEY: z.string().min(1).optional(),
		AI_EMBEDDING_MODEL: z.string().min(1).default("openai/text-embedding-3-small"),
		RAG_CHUNK_SIZE: z.coerce.number().int().min(200).max(8000).default(1000),
		RAG_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(2000).default(150),
		RAG_TOP_K: z.coerce.number().int().min(1).max(50).default(5),
		CHAT_MAX_STEPS: z.coerce.number().int().min(1).max(20).default(5),
		RUN_MIGRATIONS: booleanFromString,
	})
	.superRefine((env, context) => {
		if (env.RAG_CHUNK_OVERLAP >= env.RAG_CHUNK_SIZE) {
			context.addIssue({
				code: "custom",
				path: ["RAG_CHUNK_OVERLAP"],
				message: "RAG_CHUNK_OVERLAP must be smaller than RAG_CHUNK_SIZE",
			});
		}
		if (env.NODE_ENV !== "production") {
			return;
		}
		if (env.JWT_SECRET === developmentJwtSecret) {
			context.addIssue({
				code: "custom",
				path: ["JWT_SECRET"],
				message: "JWT_SECRET must be changed in production",
			});
		}
		if (!env.AI_API_KEY) {
			context.addIssue({
				code: "custom",
				path: ["AI_API_KEY"],
				message: "AI_API_KEY is required in production",
			});
		}
	});

export type Env = z.infer<typeof envSchema>;

/** Parse and validate the API environment once. Throws `CONFIG_INVALID` listing every bad key. */
export function parseEnv(source: ConfigSource = process.env): Env {
	return loadConfig(envSchema, source);
}
