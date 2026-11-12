import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createDatabase, runMigrations, sourceMigrationsFolder } from "@synapse/database";
import { sql } from "drizzle-orm";

import { DrizzleAuthRepository } from "@/modules/auth";
import { DrizzleOrganizationRepository } from "@/modules/organizations";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;
const email = (name: string) => `${name}-${crypto.randomUUID()}@it-org.example`;

describe.skipIf(!url)("organizations (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const auth = new DrizzleAuthRepository(database.db);
	const organizations = new DrizzleOrganizationRepository(database.db);

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		await database.db.execute(
			sql`delete from organizations where id in (select organization_id from organization_members m join users u on u.id = m.user_id where u.email like '%@it-org.example')`,
		);
		await database.db.execute(sql`delete from users where email like '%@it-org.example'`);
		await database.close();
	});

	test("sign-up creates a personal organization with the user's id, owned by them", async () => {
		const user = await auth.createUser({ email: email("ada"), passwordHash: "h" });
		const id = user?.id ?? "";
		expect(await organizations.find(id)).toMatchObject({ id, kind: "personal", name: "Personal" });
		expect(await organizations.role(id, id)).toBe("owner");
	});

	test("every user that existed before organizations has a personal one (backfill)", async () => {
		const [row] = await database.db.execute(
			sql`select count(*)::int as missing from users u where not exists (select 1 from organization_members m where m.organization_id = u.id and m.user_id = u.id and m.role = 'owner')`,
		);
		expect(row).toEqual({ missing: 0 });
	});

	test("teams: owner on create, members with roles, owner count, removal", async () => {
		const ada = (await auth.createUser({ email: email("ada"), passwordHash: "h" }))?.id ?? "";
		const bob = (await auth.createUser({ email: email("bob"), passwordHash: "h" }))?.id ?? "";
		const team = await organizations.create("Support", ada);
		expect(team.kind).toBe("team");

		await organizations.saveMember(team.id, bob, "member");
		await organizations.saveMember(team.id, bob, "admin");
		expect(await organizations.role(team.id, bob)).toBe("admin");
		expect((await organizations.members(team.id)).map((m) => m.role)).toEqual(["owner", "admin"]);
		expect(await organizations.countOwners(team.id)).toBe(1);
		expect((await organizations.listForUser(bob)).map((o) => o.kind)).toEqual(["personal", "team"]);

		expect(await organizations.removeMember(team.id, bob)).toBe(true);
		expect(await organizations.role(team.id, bob)).toBeNull();
	});

	test("a session remembers its active organization", async () => {
		const user = (await auth.createUser({ email: email("cy"), passwordHash: "h" }))?.id ?? "";
		const team = await organizations.create("Ops", user);
		const hash = `hash-${crypto.randomUUID()}`;
		const { id } = await auth.createSession({
			userId: user,
			refreshTokenHash: hash,
			expiresAt: new Date(Date.now() + 86_400_000),
			userAgent: null,
		});
		expect((await auth.findSessionByRefreshTokenHash(hash))?.organizationId).toBeNull();
		await auth.setSessionOrganization({ sessionId: id, userId: user, organizationId: team.id });
		expect((await auth.findSessionByRefreshTokenHash(hash))?.organizationId).toBe(team.id);
	});
});
