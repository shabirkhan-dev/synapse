import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export type DatabaseOptions = {
	url: string;
	poolMax?: number;
	ssl?: boolean;
};

/** Own drizzle migrations journal so this app never collides with apps/nest-api in a shared database. */
export const MIGRATIONS_TABLE = "__drizzle_migrations_ai_api";

export function createDatabase({ url, poolMax = 5, ssl }: DatabaseOptions) {
	const useSsl = ssl ?? url.includes("neon.tech");
	const client = postgres(url, {
		max: poolMax,
		prepare: false,
		// Silence NOTICEs such as `extension "vector" already exists, skipping`.
		onnotice: () => {},
		...(useSsl ? { ssl: "require" as const } : {}),
	});
	const db: Database = drizzle(client, { schema });
	return {
		db,
		client,
		close: () => client.end({ timeout: 5 }),
	};
}
