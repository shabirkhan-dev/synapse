export { createDatabase, type Database, type DatabaseOptions } from "./client/database";
export {
	MIGRATIONS_TABLE,
	runMigrations,
	sourceMigrationsFolder,
} from "./migrations/run-migrations";
export * from "./schema";
