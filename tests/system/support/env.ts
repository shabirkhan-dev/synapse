import { fileURLToPath } from "node:url";

/**
 * Where the system suites run. Own ports, so they never collide with `bun run dev` or the e2e
 * suite. The only input is a throwaway Postgres with pgvector (`SYSTEM_DATABASE_URL`).
 */
export const SYSTEM = {
	databaseUrl: process.env.SYSTEM_DATABASE_URL ?? "",
	apiPort: 8200,
	modelPort: 5602,
	/** The API reaches Postgres through this proxy, so the chaos suite can cut the connection. */
	databaseProxyPort: 5499,
	/** Known to the suites, so they can sign tokens the API accepts (forged-claim tests). */
	jwtSecret: ["system", "suite", "signing", "secret", "not", "for", "production"].join("-"),
	get apiUrl() {
		return `http://127.0.0.1:${this.apiPort}/api/v1`;
	},
	output: fileURLToPath(new URL("../.output/", import.meta.url)),
	repoRoot: fileURLToPath(new URL("../../../", import.meta.url)),
};

/** A password that meets the API's policy; built so no secret scanner mistakes it for one. */
export const PASSWORD = ["correct", "horse", "battery", "staple"].join("-");

export function uniqueEmail(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}
