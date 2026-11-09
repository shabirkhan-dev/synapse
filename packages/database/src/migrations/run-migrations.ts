import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
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
export const sourceMigrationsFolder = fileURLToPath(new URL("../../migrations", import.meta.url));

/** Advisory lock key shared by every process that runs migrations (any constant works). */
const MIGRATION_LOCK_KEY = 4_815_162_342;

/**
 * Apply pending migrations. Several processes may start at once (two API replicas in a deploy,
 * parallel test suites): the migrator reads its journal before its own transaction, so without a
 * lock both would apply the same migration. Everything runs in one transaction that first takes a
 * Postgres advisory lock; a second runner waits, then finds nothing left to do.
 */
export async function runMigrations(db: Database, migrationsFolder: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`);
		// The migrator only needs `dialect` and `session`, which a transaction has too; its own
		// transaction becomes a savepoint inside this one.
		await migrate(tx as unknown as Database, {
			migrationsFolder,
			migrationsTable: MIGRATIONS_TABLE,
		});
	});
}
