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
	return { userId: data.user.id as string, token: data.tokens.accessToken as string };
}

/** Ada owns a team; Bob is a member. */
async function team(app: App) {
	const ada = await signUp(app, "ada@example.com");
	const bob = await signUp(app, "bob@example.com");
	const orgId = (await request(app, "POST", "/organizations", ada.token, { name: "Support" })).body
		.data.id as string;
	await request(app, "POST", `/organizations/${orgId}/members`, ada.token, {
		email: "bob@example.com",
		role: "member",
	});
	return { ada, bob, orgId };
}

describe("invitations", () => {
	test("an admin invites a new address; after signing up with it, the link joins the team once", async () => {
		const { app, email } = buildTestApp();
		const { ada, orgId } = await team(app);

		const invited = await request(app, "POST", `/organizations/${orgId}/invitations`, ada.token, {
			email: "New.Comer@Example.com",
			role: "admin",
		});
		expect(invited.status).toBe(201);
		expect(invited.body.data).toMatchObject({ email: "new.comer@example.com", role: "admin" });
		const message = email.sent.findLast((m) => m.to === "new.comer@example.com");
		expect(message?.subject).toBe("You're invited to Support on Synapse");
		expect(message?.text).toContain("/invite?token=");
		const token = email.lastToken("new.comer@example.com");

		const pending = await request(app, "GET", `/organizations/${orgId}/invitations`, ada.token);
		expect(pending.body.data).toHaveLength(1);

		const newcomer = await signUp(app, "new.comer@example.com");
		const accepted = await request(
			app,
			"POST",
			"/organizations/invitations/accept",
			newcomer.token,
			{
				token,
			},
		);
		expect(accepted.status).toBe(200);
		expect(accepted.body.data).toMatchObject({ id: orgId, name: "Support", role: "admin" });
		const members = await request(app, "GET", `/organizations/${orgId}/members`, ada.token);
		expect(members.body.data.map((m: { email: string }) => m.email)).toContain(
			"new.comer@example.com",
		);
		expect(
			(await request(app, "GET", `/organizations/${orgId}/invitations`, ada.token)).body.data,
		).toEqual([]);

		// Single use.
		const again = await request(app, "POST", "/organizations/invitations/accept", newcomer.token, {
			token,
		});
		expect(again.status).toBe(400);
		expect(again.body.error.code).toBe("ORGANIZATION_INVITATION_INVALID");
	});

	test("only the invited address may accept, and a link stops working when withdrawn or replaced", async () => {
		const { app, email } = buildTestApp();
		const { ada, bob, orgId } = await team(app);
		await request(app, "POST", `/organizations/${orgId}/invitations`, ada.token, {
			email: "cy@example.com",
		});
		const first = email.lastToken("cy@example.com");

		// Someone else's account cannot use Cy's link.
		const wrong = await request(app, "POST", "/organizations/invitations/accept", bob.token, {
			token: first,
		});
		expect(wrong.status).toBe(403);
		expect(wrong.body.error.code).toBe("ORGANIZATION_INVITATION_OTHER_EMAIL");

		// A second invitation replaces the first link.
		await request(app, "POST", `/organizations/${orgId}/invitations`, ada.token, {
			email: "cy@example.com",
		});
		const second = email.lastToken("cy@example.com");
		const cy = await signUp(app, "cy@example.com");
		expect(
			(await request(app, "POST", "/organizations/invitations/accept", cy.token, { token: first }))
				.status,
		).toBe(400);

		// Withdrawn: the second link stops working too.
		const [pending] = (await request(app, "GET", `/organizations/${orgId}/invitations`, ada.token))
			.body.data;
		const revoked = await request(
			app,
			"DELETE",
			`/organizations/${orgId}/invitations/${pending.id}`,
			ada.token,
		);
		expect(revoked.status).toBe(200);
		expect(
			(await request(app, "POST", "/organizations/invitations/accept", cy.token, { token: second }))
				.status,
		).toBe(400);
	});

	test("refused: existing accounts, members inviting, admins inviting admins, personal workspaces", async () => {
		const { app } = buildTestApp();
		const { ada, bob, orgId } = await team(app);
		const existing = await request(app, "POST", `/organizations/${orgId}/invitations`, ada.token, {
			email: "bob@example.com",
		});
		expect(existing.status).toBe(409);
		expect(existing.body.error.code).toBe("ORGANIZATION_USER_EXISTS");
		const asMember = await request(app, "POST", `/organizations/${orgId}/invitations`, bob.token, {
			email: "dee@example.com",
		});
		expect(asMember.status).toBe(403);
		expect(
			(await request(app, "GET", `/organizations/${orgId}/invitations`, bob.token)).status,
		).toBe(403);
		const personal = await request(
			app,
			"POST",
			`/organizations/${ada.userId}/invitations`,
			ada.token,
			{ email: "dee@example.com" },
		);
		expect(personal.status).toBe(400);
		expect(personal.body.error.code).toBe("ORGANIZATION_PERSONAL");
	});

	test("an invitation that could not be emailed is not kept", async () => {
		const { app, email } = buildTestApp();
		const { ada, orgId } = await team(app);
		email.send = async () => {
			throw new Error("resend is down");
		};
		const invited = await request(app, "POST", `/organizations/${orgId}/invitations`, ada.token, {
			email: "dee@example.com",
		});
		expect(invited.status).toBe(500);
		expect(
			(await request(app, "GET", `/organizations/${orgId}/invitations`, ada.token)).body.data,
		).toEqual([]);
	});
});
