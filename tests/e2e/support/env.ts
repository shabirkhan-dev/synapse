import { fileURLToPath } from "node:url";

/**
 * Where the suite runs everything. Own ports so it never collides with `bun run dev`. The only
 * required input is a throwaway Postgres with pgvector (`E2E_DATABASE_URL`).
 */
export const E2E = {
	databaseUrl: process.env.E2E_DATABASE_URL ?? "",
	apiPort: 8100,
	consolePort: 3100,
	modelPort: 5601,
	get apiUrl() {
		return `http://localhost:${this.apiPort}/api/v1`;
	},
	get consoleUrl() {
		return `http://localhost:${this.consolePort}`;
	},
	/** The API's stdout: in development it logs every email it would send (links included). */
	apiLog: fileURLToPath(new URL("../.output/api.log", import.meta.url)),
	repoRoot: fileURLToPath(new URL("../../../", import.meta.url)),
};

/** A password that meets the API's policy; built so no secret scanner mistakes it for one. */
export const PASSWORD = ["correct", "horse", "battery", "staple"].join("-");
export const NEW_PASSWORD = ["purple", "monkey", "dishwasher", "lamp"].join("-");

export function uniqueEmail(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}
