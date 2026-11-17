import { afterAll, describe, expect, test } from "bun:test";
import { createServer } from "node:net";

import {
	createDatabase,
	DATABASE_CONNECT_TIMEOUT_SECONDS,
	databaseReconnectDelay,
} from "../src/client/database";

// Accepts every connection and closes it at once: what a cut proxy or a restarting Postgres looks
// like. postgres.js counts that as transient and, by default, keeps queries waiting for 30 s.
const closing = createServer((socket) => socket.end());
await new Promise<void>((resolve) => closing.listen(0, "127.0.0.1", resolve));
const address = closing.address();
const port = typeof address === "object" && address ? address.port : 0;

afterAll(() => closing.close());

describe("createDatabase while Postgres is unreachable", () => {
	test(
		"a query fails within the connect timeout instead of waiting half a minute (syn-071)",
		async () => {
			const database = createDatabase({ url: `postgresql://u:p@127.0.0.1:${port}/x` });
			const started = performance.now();
			const error = await database.client`select 1`.then(
				() => null,
				(caught: unknown) => caught as { code?: string },
			);
			const seconds = (performance.now() - started) / 1000;
			expect(error?.code).toBe("CONNECTION_CLOSED");
			expect(seconds).toBeGreaterThanOrEqual(DATABASE_CONNECT_TIMEOUT_SECONDS - 0.5);
			expect(seconds).toBeLessThan(DATABASE_CONNECT_TIMEOUT_SECONDS + 2);
			await database.client.end({ timeout: 0 });
		},
		(DATABASE_CONNECT_TIMEOUT_SECONDS + 5) * 1000,
	);

	test("reconnect attempts stay at most a second apart, so recovery is quick", () => {
		for (const attempt of [1, 2, 5, 10, 50]) {
			const delay = databaseReconnectDelay(attempt);
			expect(delay).toBeGreaterThan(0);
			expect(delay).toBeLessThanOrEqual(1);
		}
		expect(databaseReconnectDelay(1)).toBeLessThanOrEqual(0.1);
	});
});
