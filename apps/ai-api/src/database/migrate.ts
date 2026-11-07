import { join } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase, MIGRATIONS_TABLE } from "./database";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required to run migrations");
}

/** Works from src/ (bun src/database/migrate.ts) and from the bundle (bun dist/database/migrate.js). */
export const migrationsFolder = process.env.MIGRATIONS_DIR ?? join(import.meta.dir, "migrations");

const { db, close } = createDatabase({
	url: databaseUrl,
	poolMax: 1,
	...(process.env.DATABASE_SSL ? { ssl: process.env.DATABASE_SSL === "true" } : {}),
});

try {
	await migrate(db, { migrationsFolder, migrationsTable: MIGRATIONS_TABLE });
	console.info(`[ai-api] migrations applied from ${migrationsFolder}`);
} finally {
	await close();
}
