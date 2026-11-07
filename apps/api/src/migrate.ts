import { join } from "node:path";

import { createDatabase, runMigrations } from "@synapse/database";

import { loadMigrationConfig } from "./config/migration.config";

/**
 * Migration entry for the built image (`bun dist/migrate.js`, run by docker-entrypoint.sh).
 * The build copies packages/database/migrations to dist/migrations next to this file.
 * During development use `bun run db:migrate` from the repo root instead.
 */
const config = loadMigrationConfig();
const migrationsFolder = config.MIGRATIONS_DIR ?? join(import.meta.dir, "migrations");

const { db, close } = createDatabase({
	url: config.DATABASE_URL,
	poolMax: 1,
	...(config.DATABASE_SSL ? { ssl: config.DATABASE_SSL === "true" } : {}),
});

try {
	await runMigrations(db, migrationsFolder);
	console.info(`[api] migrations applied from ${migrationsFolder}`);
} finally {
	await close();
}
