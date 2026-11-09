import { describe, expect, test } from "bun:test";

import { buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";
const PASSPHRASE = ["a", "long", "test", "passphrase"].join(" ");

async function request(app: App, method: string, path: string, token: string, body?: unknown) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

async function signUp(app: App, email: string) {
	const response = await app.request(`${base}/auth/sign-up`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password: PASSPHRASE }),
	});
	const { data } = await response.json();
	return {
		userId: data.user.id as string,
		token: data.tokens.accessToken as string,
		refreshToken: data.tokens.refreshToken as string,
	};
}

/** Owner Ada creates a team and adds Bob as a member; both switch into it. */
async function team(app: App) {
	const ada = await signUp(app, "ada@example.com");
	const bob = await signUp(app, "bob@example.com");
	const created = await request(app, "POST", "/organizations", ada.token, { name: "Support" });
	expect(created.status).toBe(201);
	const orgId = created.body.data.id as string;
	const added = await request(app, "POST", `/organizations/${orgId}/members`, ada.token, {
		email: "BOB@example.com",
		role: "member",
	});
	expect(added.status).toBe(200);
	const switchTo = async (token: string) =>
		(await request(app, "POST", "/auth/switch-organization", token, { organizationId: orgId })).body
			.data;
	return {
		ada,
		bob,
		orgId,
		adaTeam: (await switchTo(ada.token)).accessToken,
		bobTeam: (await switchTo(bob.token)).accessToken,
	};
}

const doc = (title: string) => ({
	title,
	content: `${title}: refunds are accepted within 30 days.`,
});

describe("organizations", () => {
	test("lists the personal organization first, then teams with the caller's role", async () => {
		const { app } = buildTestApp();
		const { ada, bob, orgId } = await team(app);
		const adaOrgs = (await request(app, "GET", "/organizations", ada.token)).body.data;
		expect(adaOrgs.map((o: { kind: string; role: string }) => [o.kind, o.role])).toEqual([
			["personal", "owner"],
			["team", "owner"],
		]);
		const bobOrgs = (await request(app, "GET", "/organizations", bob.token)).body.data;
		expect(bobOrgs.find((o: { id: string }) => o.id === orgId)?.role).toBe("member");
	});

	test("documents are shared inside a team and invisible outside it", async () => {
		const { app } = buildTestApp();
		const { ada, bob, adaTeam, bobTeam } = await team(app);
		expect((await request(app, "POST", "/rag/documents", bobTeam, doc("Team policy"))).status).toBe(
			201,
		);
		await request(app, "POST", "/rag/documents", bob.token, doc("Bob private notes"));

		const titles = async (token: string) =>
			(await request(app, "GET", "/rag/documents", token)).body.data.map(
				(d: { title: string }) => d.title,
			);
		expect(await titles(adaTeam)).toEqual(["Team policy"]);
		expect(await titles(bobTeam)).toEqual(["Team policy"]);
		expect(await titles(bob.token)).toEqual(["Bob private notes"]);
		expect(await titles(ada.token)).toEqual([]);
	});

	test("a member asks; only an admin or owner decides", async () => {
		const { app } = buildTestApp();
		const { adaTeam, bobTeam } = await team(app);
		await request(app, "POST", "/rag/documents", bobTeam, doc("Team policy"));
		const asked = await request(app, "POST", "/rag/documents/purge", bobTeam);
		expect(asked.status).toBe(202);
		const id = asked.body.data.id;

		const denied = await request(app, "POST", `/oversight/approvals/${id}/approve`, bobTeam);
		expect(denied.status).toBe(403);
		expect(denied.body.error.code).toBe("OVERSIGHT_FORBIDDEN");
		expect((await request(app, "GET", "/oversight/approvals", adaTeam)).body.data).toHaveLength(1);

		const approved = await request(app, "POST", `/oversight/approvals/${id}/approve`, adaTeam);
		expect(approved.body.data.outcome).toMatchObject({ status: "done", result: { deleted: 1 } });
		expect((await request(app, "GET", "/rag/documents", bobTeam)).body.data).toEqual([]);
	});

	test("role rules: members cannot manage, admins cannot make owners, the last owner stays", async () => {
		const { app } = buildTestApp();
		const { ada, bob, orgId, bobTeam } = await team(app);
		await signUp(app, "cy@example.com");
		const asBob = await request(app, "POST", `/organizations/${orgId}/members`, bobTeam, {
			email: "cy@example.com",
		});
		expect(asBob.status).toBe(403);

		await request(app, "POST", `/organizations/${orgId}/members`, ada.token, {
			email: "bob@example.com",
			role: "admin",
		});
		const promoteOwner = await request(app, "POST", `/organizations/${orgId}/members`, bob.token, {
			email: "cy@example.com",
			role: "owner",
		});
		expect(promoteOwner.status).toBe(403);
		expect(
			(
				await request(app, "POST", `/organizations/${orgId}/members`, bob.token, {
					email: "cy@example.com",
				})
			).status,
		).toBe(200);

		const lastOwner = await request(
			app,
			"DELETE",
			`/organizations/${orgId}/members/${ada.userId}`,
			ada.token,
		);
		expect(lastOwner.status).toBe(409);
		expect(lastOwner.body.error.code).toBe("ORGANIZATION_LAST_OWNER");

		const personal = await request(app, "POST", `/organizations/${ada.userId}/members`, ada.token, {
			email: "bob@example.com",
		});
		expect(personal.status).toBe(400);
		expect(
			(
				await request(app, "POST", `/organizations/${orgId}/members`, ada.token, {
					email: "nobody@example.com",
				})
			).status,
		).toBe(404);
	});

	test("a removed member loses access on the next request; refresh falls back to personal", async () => {
		const { app } = buildTestApp();
		const { ada, bob, orgId, bobTeam } = await team(app);
		expect((await request(app, "GET", "/rag/documents", bobTeam)).status).toBe(200);

		expect(
			(await request(app, "DELETE", `/organizations/${orgId}/members/${bob.userId}`, ada.token))
				.status,
		).toBe(200);
		const after = await request(app, "GET", "/rag/documents", bobTeam);
		expect(after.status).toBe(401);
		expect(after.body.error.code).toBe("AUTH_NOT_A_MEMBER");
		expect(
			(
				await request(app, "POST", "/auth/switch-organization", bob.token, {
					organizationId: orgId,
				})
			).status,
		).toBe(404);

		const refreshed = await app.request(`${base}/auth/refresh`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ refreshToken: bob.refreshToken }),
		});
		const token = (await refreshed.json()).data.accessToken;
		expect((await request(app, "GET", "/rag/documents", token)).status).toBe(200);
	});

	test("refresh keeps the active organization", async () => {
		const { app } = buildTestApp();
		const { bob, bobTeam } = await team(app);
		await request(app, "POST", "/rag/documents", bobTeam, doc("Team policy"));
		const refreshed = await app.request(`${base}/auth/refresh`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ refreshToken: bob.refreshToken }),
		});
		const token = (await refreshed.json()).data.accessToken;
		const titles = (await request(app, "GET", "/rag/documents", token)).body.data.map(
			(d: { title: string }) => d.title,
		);
		expect(titles).toEqual(["Team policy"]);
	});

	test("history: admins see the team's events, members only their own", async () => {
		const { app } = buildTestApp();
		const { ada, adaTeam, bobTeam } = await team(app);
		await request(app, "POST", "/rag/documents", bobTeam, doc("Bob doc"));
		await request(app, "POST", "/rag/documents", adaTeam, doc("Ada doc"));
		const actors = async (token: string) =>
			(
				await request(app, "GET", "/audit/events?action=rag.document.ingested", token)
			).body.data.map((e: { actorId: string }) => e.actorId);
		expect((await actors(adaTeam)).toSorted()).toHaveLength(2);
		const bobSees = await actors(bobTeam);
		expect(bobSees).toHaveLength(1);
		expect(bobSees).not.toContain(ada.userId);
	});
});
