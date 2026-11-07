import { join } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import type { Database } from "../client/database";

/**
 * Drizzle's journal table. Kept at its original name so databases created before the package
 * existed do not re-run migrations.
 */
export const MIGRATIONS_TABLE = "__drizzle_migrations_ai_api";

/**
 * The package's own `migrations/` folder. Valid only when running from source: a bundle must ship
 * its own copy and pass that path (see apps/api `build` and `src/migrate.ts`).
 */
export const sourceMigrationsFolder = join(import.meta.dir, "../../migrations");

export async function runMigrations(db: Database, migrationsFolder: string): Promise<void> {
	await migrate(db, { migrationsFolder, migrationsTable: MIGRATIONS_TABLE });
}
