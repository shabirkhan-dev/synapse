import { type AiConfig, createAiConfig } from "./ai.config";
import { type AppConfig, createAppConfig } from "./app.config";
import { type AuthConfig, createAuthConfig } from "./auth.config";
import { createDatabaseConfig, type DatabaseConfig } from "./database.config";
import { createEmailConfig, type EmailConfig } from "./email.config";
import { type Env, parseEnv } from "./env";
import { createGuardrailsConfig, type GuardrailsConfig } from "./guardrails.config";
import { createLimitsConfig, type LimitsConfig } from "./limits.config";
import { createObservabilityConfig, type ObservabilityConfig } from "./observability.config";
import { createRagConfig, type RagConfig } from "./rag.config";
import { createReliabilityConfig, type ReliabilityConfig } from "./reliability.config";

export type {
	AiConfig,
	AppConfig,
	AuthConfig,
	DatabaseConfig,
	EmailConfig,
	Env,
	GuardrailsConfig,
	ObservabilityConfig,
	RagConfig,
	ReliabilityConfig,
};

export type Configuration = {
	app: AppConfig;
	auth: AuthConfig;
	database: DatabaseConfig;
	email: EmailConfig;
	ai: AiConfig;
	rag: RagConfig;
	guardrails: GuardrailsConfig;
	limits: LimitsConfig;
	observability: ObservabilityConfig;
	reliability: ReliabilityConfig;
};

/** Build the typed domain configs from a parsed environment. */
export function createConfiguration(env: Env): Configuration {
	return {
		app: createAppConfig(env),
		auth: createAuthConfig(env),
		database: createDatabaseConfig(env),
		email: createEmailConfig(env),
		ai: createAiConfig(env),
		rag: createRagConfig(env),
		guardrails: createGuardrailsConfig(env),
		limits: createLimitsConfig(env),
		observability: createObservabilityConfig(env),
		reliability: createReliabilityConfig(env),
	};
}

/** Parse the environment once at startup and build every config. Fails fast on bad config. */
export function loadConfiguration(source?: Record<string, string | undefined>): Configuration {
	return createConfiguration(parseEnv(source));
}
