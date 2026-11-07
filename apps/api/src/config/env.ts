import { z } from "@hono/zod-openapi";
import { type ConfigSource, loadConfig } from "@synapse/core/config";

/** Development-only default; production rejects it. */
export const developmentJwtSecret = "development-only-jwt-secret-change-me";

const modelPricesSchema = z.record(
	z.string(),
	z.object({
		inputPerMillionTokens: z.number().nonnegative(),
		outputPerMillionTokens: z.number().nonnegative(),
	}),
);

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
		/** Defaults to `json` in production and `pretty` elsewhere. */
		LOG_FORMAT: z.enum(["json", "pretty"]).optional(),
		/** OTLP/HTTP collector base URL (e.g. http://localhost:4318); traces are not exported when unset. */
		OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
		/** Langfuse project keys: set both to export traces to Langfuse over OTLP instead. */
		LANGFUSE_PUBLIC_KEY: z.string().startsWith("pk-lf-").optional(),
		LANGFUSE_SECRET_KEY: z.string().startsWith("sk-lf-").optional(),
		/** Langfuse host: EU cloud by default; https://us.cloud.langfuse.com or self-hosted. */
		LANGFUSE_BASE_URL: z.url().default("https://cloud.langfuse.com"),
		/** JSON `{ "provider:model": { "inputPerMillionTokens": n, "outputPerMillionTokens": n } }` for cost estimates. */
		AI_MODEL_PRICES: z
			.string()
			.optional()
			.transform((value, context) => {
				if (!value) return {};
				try {
					return modelPricesSchema.parse(JSON.parse(value));
				} catch {
					context.addIssue({
						code: "custom",
						message: "AI_MODEL_PRICES must be JSON prices per model",
					});
					return z.NEVER;
				}
			}),
		/** Postgres with the pgvector extension (docker compose uses pgvector/pgvector:pg18). */
		DATABASE_URL: z.url().default("postgresql://synapse:synapse@localhost:5433/synapse"),
		DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
		DATABASE_SSL: z.enum(["true", "false"]).optional(),
		/** Access tokens are HS256 JWTs signed with this secret. */
		JWT_SECRET: z.string().min(32).default(developmentJwtSecret),
		/** Access-token lifetime. Short: access tokens are not checked against the session. */
		AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
		/** Refresh-token (session) lifetime from sign-in; refreshing rotates the token, not the expiry. */
		AUTH_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
		/** Console URL that verification and password-reset links point to. */
		APP_URL: z.url().default("http://localhost:3000"),
		/** Read the client IP from `x-forwarded-for` (only behind a proxy you control). */
		TRUST_PROXY: booleanFromString,
		/** Resend API key; without it (outside production) emails are written to the log instead. */
		RESEND_API_KEY: z.string().min(1).optional(),
		/** Sender; `onboarding@resend.dev` only delivers to your own Resend account's address. */
		EMAIL_FROM: z.string().min(3).default("Synapse <onboarding@resend.dev>"),
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
		/** `hybrid` = vector + keyword fused with RRF; `vector` = cosine similarity only. */
		RAG_SEARCH_MODE: z.enum(["vector", "hybrid"]).default("hybrid"),
		/** Token budget for the numbered passages sent to the chat model (~4 chars per token). */
		RAG_MAX_CONTEXT_TOKENS: z.coerce.number().int().min(200).max(32000).default(3000),
		CHAT_MAX_STEPS: z.coerce.number().int().min(1).max(20).default(5),
		RUN_MIGRATIONS: booleanFromString,
	})
	.superRefine((env, context) => {
		if (Boolean(env.LANGFUSE_PUBLIC_KEY) !== Boolean(env.LANGFUSE_SECRET_KEY)) {
			context.addIssue({
				code: "custom",
				path: ["LANGFUSE_SECRET_KEY"],
				message: "Set both LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY, or neither",
			});
		}
		if (env.LANGFUSE_PUBLIC_KEY && env.OTEL_EXPORTER_OTLP_ENDPOINT) {
			context.addIssue({
				code: "custom",
				path: ["OTEL_EXPORTER_OTLP_ENDPOINT"],
				message: "Export traces to Langfuse or to OTEL_EXPORTER_OTLP_ENDPOINT, not both",
			});
		}
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
		if (!env.RESEND_API_KEY) {
			context.addIssue({
				code: "custom",
				path: ["RESEND_API_KEY"],
				message: "RESEND_API_KEY is required in production (verification and reset emails)",
			});
		}
	});

export type Env = z.infer<typeof envSchema>;

/** Parse and validate the API environment once. Throws `CONFIG_INVALID` listing every bad key. */
export function parseEnv(source: ConfigSource = process.env): Env {
	return loadConfig(envSchema, source);
}
