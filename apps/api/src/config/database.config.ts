import type { DatabaseOptions } from "@synapse/database";

import type { Env } from "./env";

export type DatabaseConfig = DatabaseOptions;

export function createDatabaseConfig(env: Env): DatabaseConfig {
	return {
		url: env.DATABASE_URL,
		poolMax: env.DATABASE_POOL_MAX,
		...(env.DATABASE_SSL ? { ssl: env.DATABASE_SSL === "true" } : {}),
	};
}
