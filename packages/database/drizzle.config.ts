import { defineConfig } from "drizzle-kit";

import { MIGRATIONS_TABLE } from "./src/migrations/run-migrations";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./migrations",
	migrations: { table: MIGRATIONS_TABLE },
	// `drizzle-kit generate` does not connect; migrate/push/studio need a real DATABASE_URL.
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgresql://synapse:synapse@localhost:5433/synapse",
	},
	strict: true,
	verbose: true,
});
