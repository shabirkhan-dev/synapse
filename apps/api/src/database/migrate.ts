import { join } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { loadMigrationConfig } from "../config/migration.config";
import { createDatabase, MIGRATIONS_TABLE } from "./database";

const config = loadMigrationConfig();

/** Works from src/ (bun src/database/migrate.ts) and from the bundle (bun dist/database/migrate.js). */
export const migrationsFolder = config.MIGRATIONS_DIR ?? join(import.meta.dir, "migrations");

const { db, close } = createDatabase({
	url: config.DATABASE_URL,
	poolMax: 1,
	...(config.DATABASE_SSL ? { ssl: config.DATABASE_SSL === "true" } : {}),
});

try {
	await migrate(db, { migrationsFolder, migrationsTable: MIGRATIONS_TABLE });
	console.info(`[api] migrations applied from ${migrationsFolder}`);
} finally {
	await close();
}
