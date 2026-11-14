import { closeSync, mkdirSync, openSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

import { type DatabaseProxy, startDatabaseProxy } from "./database-proxy";
import { SYSTEM } from "./env";

export type ModelFault = { delayMs?: number; status?: number; only?: "chat" | "embeddings" };

export type Stack = {
	apiUrl: string;
	/** Direct connection (not through the proxy) for setup and assertions. */
	sql: postgres.Sql;
	database: DatabaseProxy;
	/** Make every model call slow and/or fail; `{}` heals it. */
	modelFault(fault: ModelFault): Promise<void>;
	stop(): Promise<void>;
};

const FAKE_MODEL = join(SYSTEM.repoRoot, "tests/e2e/support/fake-model-provider.ts");

/** Settings every suite starts from; a suite overrides what it tests (timeouts, breaker). */
const BASE_ENV: Record<string, string> = {
	NODE_ENV: "development",
	PORT: String(SYSTEM.apiPort),
	JWT_SECRET: SYSTEM.jwtSecret,
	APP_URL: "http://localhost:3200",
	CORS_ORIGIN: "http://localhost:3200",
	LOG_FORMAT: "json",
	// Lets each suite sign-up claim its own client IP (support/client.ts).
	TRUST_PROXY: "true",
	AI_PROVIDER_NAME: "fake",
	AI_BASE_URL: `http://127.0.0.1:${SYSTEM.modelPort}/v1`,
	AI_API_KEY: "system-not-a-key",
	RESEND_API_KEY: "",
	LANGFUSE_PUBLIC_KEY: "",
	LANGFUSE_SECRET_KEY: "",
	OTEL_EXPORTER_OTLP_ENDPOINT: "",
	AI_RERANK_PROVIDER: "",
	// Suites send many requests per account; security/usage-limit.test.ts sets its own budget.
	RATE_LIMIT_QUESTIONS_PER_MINUTE: "10000",
	RATE_LIMIT_INGESTS_PER_HOUR: "100000",
	RATE_LIMIT_EVALUATION_RUNS_PER_HOUR: "1000",
};

async function waitFor(url: string, process: Bun.Subprocess, logPath: string): Promise<void> {
	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		if (process.exitCode !== null) {
			throw new Error(`${url} exited (${process.exitCode}); see ${logPath}`);
		}
		// oxlint-disable-next-line no-await-in-loop -- polling until the server answers
		const up = await fetch(url).then(
			(response) => response.ok,
			() => false,
		);
		if (up) return;
		// oxlint-disable-next-line no-await-in-loop -- polling interval
		await Bun.sleep(200);
	}
	throw new Error(`${url} did not start in 30 s; see ${logPath}`);
}

/** SIGTERM, then SIGKILL if the process is still draining connections after 2 s. */
async function terminate(child: Bun.Subprocess): Promise<void> {
	child.kill();
	const exited = await Promise.race([child.exited.then(() => true), Bun.sleep(2_000)]);
	if (exited !== true) child.kill("SIGKILL");
	await child.exited;
}

/**
 * Starts the fake model, a cuttable proxy in front of Postgres and the API from source (migrated,
 * rate limits cleared). One stack per test file: `beforeAll(start)`, `afterAll(stop)`.
 */
export async function startStack(env: Record<string, string> = {}): Promise<Stack> {
	if (!SYSTEM.databaseUrl) {
		throw new Error("Set SYSTEM_DATABASE_URL to a throwaway Postgres with pgvector");
	}
	mkdirSync(SYSTEM.output, { recursive: true });
	const direct = new URL(SYSTEM.databaseUrl);
	const proxied = new URL(SYSTEM.databaseUrl);
	proxied.hostname = "127.0.0.1";
	proxied.port = String(SYSTEM.databaseProxyPort);

	const migrated = Bun.spawnSync(["bun", "packages/database/src/migrate.ts"], {
		cwd: SYSTEM.repoRoot,
		env: { PATH: process.env.PATH ?? "", DATABASE_URL: SYSTEM.databaseUrl },
		stdout: "inherit",
		stderr: "inherit",
	});
	if (migrated.exitCode !== 0) throw new Error("migrations failed");
	const sql = postgres(SYSTEM.databaseUrl, { max: 2, onnotice: () => {} });
	await sql`delete from auth_rate_limits`;

	const database = await startDatabaseProxy(SYSTEM.databaseProxyPort, {
		host: direct.hostname,
		port: Number(direct.port || 5432),
	});
	const modelLog = join(SYSTEM.output, "model.log");
	const modelOut = openSync(modelLog, "w");
	const model = Bun.spawn(["bun", FAKE_MODEL, String(SYSTEM.modelPort)], {
		stdout: modelOut,
		stderr: modelOut,
	});
	await waitFor(`http://127.0.0.1:${SYSTEM.modelPort}/health`, model, modelLog);

	const apiLog = join(SYSTEM.output, "api.log");
	const apiOut = openSync(apiLog, "w");
	const api = Bun.spawn(["bun", "src/server.ts"], {
		cwd: join(SYSTEM.repoRoot, "apps/api"),
		env: { PATH: process.env.PATH ?? "", ...BASE_ENV, DATABASE_URL: proxied.href, ...env },
		stdout: apiOut,
		stderr: apiOut,
	});
	// The children hold their own copies of the descriptors.
	closeSync(modelOut);
	closeSync(apiOut);
	try {
		await waitFor(`${SYSTEM.apiUrl}/health`, api, apiLog);
	} catch (error) {
		model.kill();
		await database.stop();
		await sql.end();
		throw error;
	}

	return {
		apiUrl: SYSTEM.apiUrl,
		sql,
		database,
		async modelFault(fault) {
			await fetch(`http://127.0.0.1:${SYSTEM.modelPort}/__fault`, {
				method: "POST",
				body: JSON.stringify(fault),
			});
		},
		async stop() {
			await Promise.all([api, model].map(terminate));
			await database.stop();
			await sql.end();
		},
	};
}
