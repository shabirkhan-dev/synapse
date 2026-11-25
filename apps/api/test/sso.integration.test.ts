import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createDatabase, runMigrations, sourceMigrationsFolder } from "@synapse/database";
import { sql } from "drizzle-orm";

import { DrizzleAuthRepository } from "@/modules/auth";
import { DrizzleOrganizationRepository } from "@/modules/organizations";
import { DrizzleSsoRepository } from "@/modules/sso";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;
const run = crypto.randomUUID().slice(0, 8);
const domain = `${run}.it-sso.test`;

describe.skipIf(!url)("single sign-on store (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const auth = new DrizzleAuthRepository(database.db);
	const organizations = new DrizzleOrganizationRepository(database.db);
	const store = new DrizzleSsoRepository(database.db);

	async function team(name: string) {
		const owner = await auth.createUser({
			email: `${name}-${run}@it-sso.example`,
			passwordHash: "h",
		});
		return organizations.create(name, owner?.id ?? "");
	}

	const input = (domains: string[], secret: string | null = "sealed-1") => ({
		issuer: "https://idp.example.com",
		clientId: "client",
		sealedClientSecret: secret,
		defaultRole: "member" as const,
		domains,
		createdBy: null as unknown as string,
	});

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		await database.db.execute(
			sql`delete from organizations where id in (select organization_id from organization_members m join users u on u.id = m.user_id where u.email like ${`%-${run}@it-sso.example`})`,
		);
		await database.db.execute(sql`delete from users where email like ${`%-${run}@it-sso.example`}`);
		await database.close();
	});

	test("save, re-save keeping the secret and verification, and find by verified domain", async () => {
		const acme = await team("acme");
		const saved = await store.save(acme.id, input([domain, `b.${domain}`]), "token-1");
		expect(saved.domains.map((item) => item.verifiedAt)).toEqual([null, null]);
		expect(await store.findByVerifiedDomain(domain)).toBeNull();

		expect(await store.markVerified(saved.id, domain, new Date())).toBe(true);
		expect((await store.findByVerifiedDomain(domain))?.id).toBe(saved.id);

		const resaved = await store.save(acme.id, input([domain], null), "token-2");
		expect(resaved.id).toBe(saved.id);
		expect(resaved.sealedClientSecret).toBe("sealed-1");
		expect(resaved.verificationToken).toBe("token-1");
		expect(resaved.domains).toEqual([{ domain, verifiedAt: expect.any(String) }]);
	});

	test("only one team holds a domain verified", async () => {
		const other = await team("other");
		const saved = await store.save(other.id, input([domain]), "token-3");
		expect(await store.markVerified(saved.id, domain, new Date())).toBe(false);
		expect((await store.find(other.id))?.domains[0]?.verifiedAt).toBeNull();
	});

	test("a sign-in state is taken once, and not after it expires", async () => {
		const owner = await team("states");
		const { id } = await store.save(owner.id, input([`s.${domain}`]), "token-4");
		const state = { connectionId: id, codeVerifier: "v", nonce: "n" };
		await store.saveState(`fresh-${run}`, { ...state, expiresAt: new Date(Date.now() + 60_000) });
		await store.saveState(`stale-${run}`, { ...state, expiresAt: new Date(Date.now() + 1000) });
		expect(await store.takeState(`fresh-${run}`, new Date())).toMatchObject({ nonce: "n" });
		expect(await store.takeState(`fresh-${run}`, new Date())).toBeNull();
		expect(await store.takeState(`stale-${run}`, new Date(Date.now() + 5000))).toBeNull();
	});

	test("turning it off deletes its domains and states", async () => {
		const gone = await team("gone");
		await store.save(gone.id, input([`g.${domain}`]), "token-5");
		expect(await store.delete(gone.id)).toBe(true);
		expect(await store.find(gone.id)).toBeNull();
		expect(await store.delete(gone.id)).toBe(false);
	});
});
