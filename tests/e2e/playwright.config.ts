import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { E2E } from "./support/env";

const isCi = Boolean(process.env.CI);

/** Settings shared by the API process: development mode so emails go to its log. */
const apiEnv = {
	NODE_ENV: "development",
	PORT: String(E2E.apiPort),
	DATABASE_URL: E2E.databaseUrl,
	APP_URL: E2E.consoleUrl,
	CORS_ORIGIN: E2E.consoleUrl,
	LOG_FORMAT: "json",
	AI_PROVIDER_NAME: "fake",
	AI_BASE_URL: `http://127.0.0.1:${E2E.modelPort}/v1`,
	AI_API_KEY: "e2e-not-a-key",
	RESEND_API_KEY: "",
	LANGFUSE_PUBLIC_KEY: "",
	LANGFUSE_SECRET_KEY: "",
	OTEL_EXPORTER_OTLP_ENDPOINT: "",
	AI_RERANK_PROVIDER: "",
};

/**
 * Browser tests of the console against the real API and Postgres, with a fake model provider.
 * `bun run test:e2e` from the root (needs `E2E_DATABASE_URL`); add `-- --trace on` to debug a failure.
 */
export default defineConfig({
	testDir: "./specs",
	outputDir: "./.output/results",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	retries: isCi ? 1 : 0,
	workers: isCi ? 2 : undefined,
	reporter: isCi ? [["list"], ["html", { outputFolder: ".output/report", open: "never" }]] : "list",
	use: {
		baseURL: E2E.consoleUrl,
		trace: "off",
		...devices["Desktop Chrome"],
	},
	webServer: [
		{
			command: `bun support/fake-model-provider.ts ${E2E.modelPort}`,
			url: `http://127.0.0.1:${E2E.modelPort}/health`,
			reuseExistingServer: !isCi,
		},
		{
			// Migrate + reset first; then its stdout is the email log the tests read links from.
			command: `bun ../../tests/e2e/support/prepare-database.ts && bun src/server.ts > ${E2E.apiLog} 2>&1`,
			cwd: join(E2E.repoRoot, "apps/api"),
			url: `${E2E.apiUrl}/health`,
			env: { ...apiEnv, E2E_DATABASE_URL: E2E.databaseUrl },
			reuseExistingServer: false,
			timeout: 60_000,
		},
		{
			// NEXT_PUBLIC_API_URL is inlined at build time, so the console is built for this API.
			command: `bun run build && bunx next start --port ${E2E.consolePort}`,
			cwd: join(E2E.repoRoot, "apps/console"),
			url: `${E2E.consoleUrl}/sign-in`,
			env: { NEXT_PUBLIC_API_URL: E2E.apiUrl, NEXT_TELEMETRY_DISABLED: "1" },
			reuseExistingServer: !isCi,
			timeout: 300_000,
		},
	],
});
