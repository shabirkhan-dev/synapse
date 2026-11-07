import { loadConfig } from "@synapse/core/config";
import { z } from "zod";

import { createDatabase } from "./client/database";
import { runMigrations, sourceMigrationsFolder } from "./migrations/run-migrations";

/** `bun run db:migrate`: apply migrations from source against DATABASE_URL. */
const config = loadConfig(
	z.object({
		DATABASE_URL: z.url(),
		DATABASE_SSL: z.enum(["true", "false"]).optional(),
	}),
);

const { db, close } = createDatabase({
	url: config.DATABASE_URL,
	poolMax: 1,
	...(config.DATABASE_SSL ? { ssl: config.DATABASE_SSL === "true" } : {}),
});

try {
	await runMigrations(db, sourceMigrationsFolder);
	console.info(`[database] migrations applied from ${sourceMigrationsFolder}`);
} finally {
	await close();
}
