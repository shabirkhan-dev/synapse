import { afterAll, describe, expect, test } from "bun:test";

import postgres from "postgres";

import { createDatabase, MIGRATIONS_TABLE, runMigrations, sourceMigrationsFolder } from "../src";

/** Real Postgres with pgvector. Opt-in: API_TEST_DATABASE_URL (a fresh database is created next to it). */
const url = process.env.API_TEST_DATABASE_URL;

describe.skipIf(!url)("runMigrations", () => {
	const name = `mig_race_${crypto.randomUUID().slice(0, 8)}`;
	const admin = postgres(url ?? "", { max: 1 });
	const fresh = (url ?? "").replace(/\/[^/?]+(\?|$)/, `/${name}$1`);

	afterAll(async () => {
		await admin.unsafe(`drop database if exists ${name} with (force)`);
		await admin.end();
	});

	test("two processes migrating a fresh database at once apply each migration exactly once", async () => {
		await admin.unsafe(`create database ${name}`);
		const one = createDatabase({ url: fresh, poolMax: 2 });
		const two = createDatabase({ url: fresh, poolMax: 2 });
		try {
			await Promise.all([
				runMigrations(one.db, sourceMigrationsFolder),
				runMigrations(two.db, sourceMigrationsFolder),
			]);
			const check = postgres(fresh, { max: 1 });
			const [row] = await check.unsafe(
				`select count(*)::int as applied, count(distinct hash)::int as distinct from drizzle.${MIGRATIONS_TABLE}`,
			);
			await check.end();
			expect(row?.applied).toBe(row?.distinct);
			expect(row?.applied).toBeGreaterThan(10);
		} finally {
			await Promise.all([one.close(), two.close()]);
		}
	}, 60_000);
});
