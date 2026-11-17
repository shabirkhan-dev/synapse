import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../schema";

export type Database = PostgresJsDatabase<typeof schema>;

export type DatabaseOptions = {
	url: string;
	poolMax?: number;
	ssl?: boolean;
};

/**
 * How long queries wait for a connection while Postgres is unreachable, in seconds. postgres.js
 * treats a connection that opens and is then closed as transient and keeps queries waiting for
 * this long (its default is 30 s), so a database blip held requests for half a minute (syn-071).
 */
export const DATABASE_CONNECT_TIMEOUT_SECONDS = 5;

/**
 * Seconds before reconnect attempt `n`: 0.1, 0.2, 0.4 … capped at 1 s, with jitter. The default
 * grows to 20 s, so after an outage the pool took 10 s or more to notice Postgres was back.
 */
export const databaseReconnectDelay = (attempt: number): number =>
	Math.min(0.05 * 2 ** attempt, 1) * (0.5 + Math.random() / 2);

export function createDatabase({ url, poolMax = 5, ssl }: DatabaseOptions) {
	const useSsl = ssl ?? url.includes("neon.tech");
	const client = postgres(url, {
		max: poolMax,
		prepare: false,
		connect_timeout: DATABASE_CONNECT_TIMEOUT_SECONDS,
		backoff: databaseReconnectDelay,
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
