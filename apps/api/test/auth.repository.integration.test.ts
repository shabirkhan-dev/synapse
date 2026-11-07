import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createDatabase, runMigrations, sourceMigrationsFolder } from "@synapse/database";
import { sql } from "drizzle-orm";

import { DrizzleAuthRepository, DrizzleRateLimiter } from "@/modules/auth";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;
const email = (name: string) => `${name}-${crypto.randomUUID()}@it.example`;
const inAMonth = () => new Date(Date.now() + 30 * 86_400_000);

describe.skipIf(!url)("DrizzleAuthRepository (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const repository = new DrizzleAuthRepository(database.db);
	const rateLimiter = new DrizzleRateLimiter(database.db);

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		await database.db.execute(sql`delete from users where email like '%@it.example'`);
		await database.db.execute(sql`delete from auth_rate_limits where key like 'it-%'`);
		await database.close();
	});

	test("creates users once per email and never returns the hash from createUser", async () => {
		const address = email("ada");
		const user = await repository.createUser({ email: address, passwordHash: "$argon2id$x" });
		expect(user).toMatchObject({ email: address });
		expect(user).not.toHaveProperty("passwordHash");
		expect(await repository.createUser({ email: address, passwordHash: "$argon2id$y" })).toBeNull();
		expect(await repository.findUserByEmail(address)).toMatchObject({
			passwordHash: "$argon2id$x",
		});
		expect(await repository.findUserById(user?.id ?? "")).toEqual(user);
	});

	test("rotates refresh tokens atomically and remembers the previous hash", async () => {
		const user = await repository.createUser({ email: email("rot"), passwordHash: "h" });
		const userId = user?.id ?? "";
		const { id } = await repository.createSession({
			userId,
			refreshTokenHash: "hash-1",
			expiresAt: inAMonth(),
		});
		expect(await repository.findSessionByRefreshTokenHash("hash-1")).toMatchObject({
			id,
			userId,
			matched: "current",
			revokedAt: null,
		});

		const rotate = (currentHash: string, nextHash: string) =>
			repository.rotateRefreshToken({ sessionId: id, currentHash, nextHash });
		// Two requests race with the same token: exactly one wins.
		expect(await Promise.all([rotate("hash-1", "hash-2a"), rotate("hash-1", "hash-2b")])).toContain(
			false,
		);
		const winner = (await repository.findSessionByRefreshTokenHash("hash-2a"))
			? "hash-2a"
			: "hash-2b";
		expect(await repository.findSessionByRefreshTokenHash("hash-1")).toMatchObject({
			matched: "previous",
		});

		// Only the owner can revoke; a revoked session cannot rotate.
		await repository.revokeSession({ sessionId: id, userId: crypto.randomUUID() });
		expect((await repository.findSessionByRefreshTokenHash(winner))?.revokedAt).toBeNull();
		await repository.revokeSession({ sessionId: id, userId });
		expect((await repository.findSessionByRefreshTokenHash(winner))?.revokedAt).toBeInstanceOf(
			Date,
		);
		expect(await rotate(winner, "hash-3")).toBe(false);
	});

	test("deleting a user deletes their sessions", async () => {
		const user = await repository.createUser({ email: email("del"), passwordHash: "h" });
		await repository.createSession({
			userId: user?.id ?? "",
			refreshTokenHash: `del-${crypto.randomUUID()}`,
			expiresAt: inAMonth(),
		});
		await database.db.execute(sql`delete from users where id = ${user?.id}`);
		const left = await database.db.execute(
			sql`select count(*)::int as n from auth_sessions where user_id = ${user?.id}`,
		);
		expect([...left]).toEqual([{ n: 0 }]);
	});

	test("rate limits count concurrent hits exactly and reset after the window", async () => {
		const key = `it-${crypto.randomUUID()}`;
		const rule = { limit: 5, windowSeconds: 60 };
		const results = await Promise.all(Array.from({ length: 8 }, () => rateLimiter.hit(key, rule)));
		expect(results.filter((r) => r.allowed)).toHaveLength(5);
		expect(results.every((r) => r.retryAfterSeconds > 0 && r.retryAfterSeconds <= 60)).toBe(true);

		await database.db.execute(
			sql`update auth_rate_limits set window_started_at = now() - interval '61 seconds' where key = ${key}`,
		);
		expect(await rateLimiter.hit(key, rule)).toMatchObject({ allowed: true });
	});

	test("emailed tokens are single-use, expire, and a new one voids the old", async () => {
		const user = await repository.createUser({ email: email("tok"), passwordHash: "h" });
		const userId = user?.id ?? "";
		const purpose = "password_reset" as const;
		const later = new Date(Date.now() + 3_600_000);
		await repository.replaceAuthToken({
			userId,
			purpose,
			tokenHash: `t1-${userId}`,
			expiresAt: later,
		});
		await repository.replaceAuthToken({
			userId,
			purpose,
			tokenHash: `t2-${userId}`,
			expiresAt: later,
		});

		expect(await repository.consumeAuthToken({ purpose, tokenHash: `t1-${userId}` })).toBeNull();
		expect(
			await repository.consumeAuthToken({
				purpose: "email_verification",
				tokenHash: `t2-${userId}`,
			}),
		).toBeNull();
		const [first, second] = await Promise.all([
			repository.consumeAuthToken({ purpose, tokenHash: `t2-${userId}` }),
			repository.consumeAuthToken({ purpose, tokenHash: `t2-${userId}` }),
		]);
		expect([first, second].filter(Boolean)).toEqual([userId]);

		await repository.replaceAuthToken({
			userId,
			purpose,
			tokenHash: `t3-${userId}`,
			expiresAt: new Date(Date.now() - 1000),
		});
		expect(await repository.consumeAuthToken({ purpose, tokenHash: `t3-${userId}` })).toBeNull();
	});

	test("verification, password change and sign-out everywhere", async () => {
		const user = await repository.createUser({ email: email("acct"), passwordHash: "old" });
		const userId = user?.id ?? "";
		expect(user?.emailVerifiedAt).toBeNull();
		await repository.markEmailVerified(userId);
		const verifiedAt = (await repository.findUserById(userId))?.emailVerifiedAt;
		expect(verifiedAt).toBeString();
		await repository.markEmailVerified(userId);
		expect((await repository.findUserById(userId))?.emailVerifiedAt).toBe(verifiedAt ?? "");

		await repository.updatePasswordHash({ userId, passwordHash: "new" });
		expect((await repository.findUserByEmail(user?.email ?? ""))?.passwordHash).toBe("new");

		const hashes = [`a-${userId}`, `b-${userId}`];
		await Promise.all(
			hashes.map((refreshTokenHash) =>
				repository.createSession({ userId, refreshTokenHash, expiresAt: inAMonth() }),
			),
		);
		await repository.revokeAllSessions(userId);
		const sessions = await Promise.all(
			hashes.map((h) => repository.findSessionByRefreshTokenHash(h)),
		);
		expect(sessions.every((session) => session?.revokedAt instanceof Date)).toBe(true);
	});
});
