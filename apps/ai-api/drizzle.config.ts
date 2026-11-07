import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/database/schema/index.ts",
	out: "./src/database/migrations",
	migrations: { table: "__drizzle_migrations_ai_api" },
	// `drizzle-kit generate` does not connect; migrate/push/studio need a real DATABASE_URL.
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgresql://starter:starter@localhost:5433/starter",
	},
	strict: true,
	verbose: true,
});
