import { loadConfig } from "@synapse/core/config";
import { z } from "zod";

/** Only what `migrate.ts` needs, so migrations run without the full API environment. */
const migrationEnvSchema = z.object({
	DATABASE_URL: z.url(),
	DATABASE_SSL: z.enum(["true", "false"]).optional(),
	/** Override the migrations folder (defaults to the one next to migrate.ts). */
	MIGRATIONS_DIR: z.string().min(1).optional(),
});

export type MigrationConfig = z.infer<typeof migrationEnvSchema>;

export function loadMigrationConfig(source: Record<string, string | undefined> = process.env) {
	return loadConfig(migrationEnvSchema, source);
}
