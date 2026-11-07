import { type AiConfig, createAiConfig } from "./ai.config";
import { type AppConfig, createAppConfig } from "./app.config";
import { type AuthConfig, createAuthConfig } from "./auth.config";
import { createDatabaseConfig, type DatabaseConfig } from "./database.config";
import { type Env, parseEnv } from "./env";
import { createRagConfig, type RagConfig } from "./rag.config";

export type { AiConfig, AppConfig, AuthConfig, DatabaseConfig, Env, RagConfig };

export type Configuration = {
	app: AppConfig;
	auth: AuthConfig;
	database: DatabaseConfig;
	ai: AiConfig;
	rag: RagConfig;
};

/** Build the typed domain configs from a parsed environment. */
export function createConfiguration(env: Env): Configuration {
	return {
		app: createAppConfig(env),
		auth: createAuthConfig(env),
		database: createDatabaseConfig(env),
		ai: createAiConfig(env),
		rag: createRagConfig(env),
	};
}

/** Parse the environment once at startup and build every config. Fails fast on bad config. */
export function loadConfiguration(source?: Record<string, string | undefined>): Configuration {
	return createConfiguration(parseEnv(source));
}
