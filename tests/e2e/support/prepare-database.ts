import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

import postgres from "postgres";

import { E2E } from "./env";

/**
 * Runs before the API starts (first part of its web-server command): migrate the database, clear
 * the auth rate limits (every test signs up from 127.0.0.1, and sign-up allows 10 per IP per
 * hour), and start a fresh API log.
 */
if (!E2E.databaseUrl) throw new Error("Set E2E_DATABASE_URL to a throwaway Postgres with pgvector");
const migrated = spawnSync("bun", ["packages/database/src/migrate.ts"], {
	cwd: E2E.repoRoot,
	env: { ...process.env, DATABASE_URL: E2E.databaseUrl },
	stdio: "inherit",
});
if (migrated.status !== 0) throw new Error("migrations failed");

const sql = postgres(E2E.databaseUrl, { max: 1, onnotice: () => {} });
try {
	await sql`delete from auth_rate_limits`;
} finally {
	await sql.end();
}
rmSync(E2E.apiLog, { force: true });
mkdirSync(dirname(E2E.apiLog), { recursive: true });
