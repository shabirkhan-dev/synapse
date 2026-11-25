import { describe, expect, test } from "bun:test";

import { FAKE_ISSUER } from "./fake-oidc";
import { buildTestApp } from "./helpers";

type Built = ReturnType<typeof buildTestApp>;
type App = Built["app"];
const base = "http://localhost/api/v1";
const PASSPHRASE = ["a", "long", "test", "passphrase"].join(" ");
const RECORD = "_synapse-verification.acme.test";

async function request(
	app: App,
	method: string,
	path: string,
	token?: string,
	body?: unknown,
	cookie?: string,
) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
			...(cookie ? { cookie } : {}),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json(), headers: response.headers };
}

async function signUp(app: App, email: string) {
	const { body } = await request(app, "POST", "/auth/sign-up", undefined, {
		email,
		password: PASSPHRASE,
	});
	return { userId: body.data.user.id as string, token: body.data.tokens.accessToken as string };
}

/** Ada owns the "Acme" team; returns a token acting in it and Bob, a member. */
async function team(app: App) {
	const ada = await signUp(app, "ada@example.com");
	const bob = await signUp(app, "bob@example.com");
	const orgId = (await request(app, "POST", "/organizations", ada.token, { name: "Acme" })).body
		.data.id as string;
	await request(app, "POST", `/organizations/${orgId}/members`, ada.token, {
		email: "bob@example.com",
		role: "admin",
	});
	const switchTo = async (token: string) =>
		(await request(app, "POST", "/auth/switch-organization", token, { organizationId: orgId })).body
			.data.accessToken as string;
	return { orgId, owner: await switchTo(ada.token), admin: await switchTo(bob.token), ada };
}

const settings = {
	issuer: FAKE_ISSUER,
	clientId: "synapse-console",
	clientSecret: "provider-secret",
	domains: ["Acme.Test"],
};

/** An owner sets SSO up for acme.test and the DNS record is in place and checked. */
async function configured(built: Built, dnsRecords: Record<string, string[]>) {
	const acme = await team(built.app);
	const saved = await request(built.app, "PUT", "/sso/connection", acme.owner, settings);
	dnsRecords[RECORD] = [saved.body.data.dnsRecord.value];
	await request(built.app, "POST", "/sso/connection/verify", acme.owner);
	return acme;
}

/** Start at the API, sign in at the fake provider, come back with its code. */
async function ssoSignIn(built: Built, email: string, claims: Record<string, unknown> = {}) {
	const started = await request(built.app, "POST", "/auth/sso/start", undefined, { email });
	const url = started.body.data.authorizationUrl as string;
	const code = built.oidc.authorize(url, { email, ...claims });
	const state = new URL(url).searchParams.get("state") as string;
	// The browser keeps the httpOnly cookie set at the start and sends it back with the callback.
	const cookie = (started.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
	return { url, state, code, cookie };
}

const callback = (built: Built, body: Record<string, unknown>, cookie?: string) =>
	request(built.app, "POST", "/auth/sso/callback", undefined, body, cookie);

describe("single sign-on settings", () => {
	test("an owner saves a provider; the secret is sealed and domains wait for DNS", async () => {
		const dnsRecords: Record<string, string[]> = {};
		const built = buildTestApp({ dnsRecords });
		const { owner, admin } = await team(built.app);
		expect((await request(built.app, "GET", "/sso/connection", owner)).body.data).toBeNull();

		const noSecret = await request(built.app, "PUT", "/sso/connection", owner, {
			...settings,
			clientSecret: undefined,
		});
		expect(noSecret.status).toBe(422);
		expect(noSecret.body.error.code).toBe("SSO_CLIENT_SECRET_REQUIRED");
		const typo = await request(built.app, "PUT", "/sso/connection", owner, {
			...settings,
			issuer: "https://typo.example.com",
		});
		expect(typo.status).toBe(422);
		expect(typo.body.error.code).toBe("SSO_PROVIDER_FAILED");

		const saved = await request(built.app, "PUT", "/sso/connection", owner, settings);
		expect(saved.status).toBe(200);
		expect(saved.body.data).toMatchObject({
			issuer: FAKE_ISSUER,
			clientId: "synapse-console",
			hasClientSecret: true,
			defaultRole: "member",
			redirectUri: "http://localhost:3000/sso/callback",
			domains: [{ domain: "acme.test", verifiedAt: null }],
		});
		expect(saved.body.data.dnsRecord.name).toBe("_synapse-verification");
		expect(JSON.stringify(saved.body)).not.toContain("provider-secret");
		expect(built.ssoStore.connections[0]?.sealedClientSecret).not.toContain("provider-secret");

		// Admins read; only owners change it.
		expect((await request(built.app, "GET", "/sso/connection", admin)).status).toBe(200);
		const byAdmin = await request(built.app, "PUT", "/sso/connection", admin, settings);
		expect(byAdmin.status).toBe(403);
		expect(byAdmin.body.error.code).toBe("SSO_FORBIDDEN");

		// No record yet: still unverified. With it: verified.
		const early = await request(built.app, "POST", "/sso/connection/verify", owner);
		expect(early.body.data.domains[0].verifiedAt).toBeNull();
		dnsRecords[RECORD] = ["something-else", saved.body.data.dnsRecord.value];
		const checked = await request(built.app, "POST", "/sso/connection/verify", owner);
		expect(checked.body.data.domains[0].verifiedAt).not.toBeNull();
		expect(built.auditEvents.events.map((event) => event.action)).toContain("sso.domain.verified");

		// Saving again without a secret keeps it, and keeps the domain verified.
		const resaved = await request(built.app, "PUT", "/sso/connection", owner, {
			...settings,
			clientSecret: "",
			defaultRole: "admin",
		});
		expect(resaved.body.data.hasClientSecret).toBe(true);
		expect(resaved.body.data.domains[0].verifiedAt).not.toBeNull();
	});

	test("personal workspaces have no SSO; a domain another team verified stays with it", async () => {
		const dnsRecords: Record<string, string[]> = {};
		const built = buildTestApp({ dnsRecords });
		const { ada } = await configured(built, dnsRecords);
		const personal = await request(built.app, "PUT", "/sso/connection", ada.token, settings);
		expect(personal.status).toBe(409);
		expect(personal.body.error.code).toBe("SSO_NOT_A_TEAM");

		// A second team claims acme.test with the same record value: refused at verification.
		const other = await signUp(built.app, "eve@example.com");
		const orgId = (await request(built.app, "POST", "/organizations", other.token, { name: "Eve" }))
			.body.data.id as string;
		const eve = (
			await request(built.app, "POST", "/auth/switch-organization", other.token, {
				organizationId: orgId,
			})
		).body.data.accessToken as string;
		const saved = await request(built.app, "PUT", "/sso/connection", eve, settings);
		dnsRecords[RECORD] = [saved.body.data.dnsRecord.value];
		const checked = await request(built.app, "POST", "/sso/connection/verify", eve);
		expect(checked.body.data.domains[0].verifiedAt).toBeNull();
	});
});

describe("signing in with single sign-on", () => {
	test("a new person signs in, gets an account in the team and a session there", async () => {
		const dnsRecords: Record<string, string[]> = {};
		const built = buildTestApp({ dnsRecords });
		const { orgId } = await configured(built, dnsRecords);

		const { url, state, code, cookie } = await ssoSignIn(built, "New.Person@Acme.test");
		expect(cookie).toStartWith("synapse_sso=");
		const params = new URL(url).searchParams;
		expect(url.startsWith(`${FAKE_ISSUER}/authorize?`)).toBe(true);
		expect(params.get("code_challenge_method")).toBe("S256");
		expect(params.get("redirect_uri")).toBe("http://localhost:3000/sso/callback");
		expect(params.get("login_hint")).toBe("new.person@acme.test");

		// Another browser (no cookie from the start) cannot finish it: no login CSRF.
		const elsewhere = await callback(built, { code, state });
		expect([elsewhere.status, elsewhere.body.error.code]).toEqual([400, "SSO_STATE_INVALID"]);

		const done = await callback(built, { code, state, session: "cookie" }, cookie);
		expect(done.status).toBe(200);
		expect(done.body.data.user.email).toBe("new.person@acme.test");
		expect(done.body.data.user.emailVerifiedAt).not.toBeNull();
		expect(done.body.data.tokens.refreshToken).toBeUndefined();
		expect(done.headers.get("set-cookie")).toContain("synapse_refresh=");

		const me = await request(built.app, "GET", "/auth/me", done.body.data.tokens.accessToken);
		expect(me.body.data.organization).toEqual({ id: orgId, role: "member" });
		expect(built.auditEvents.events.at(-1)?.data).toMatchObject({
			sso: true,
			organizationId: orgId,
		});

		// The state works once, even from the same browser.
		const again = await callback(built, { code, state }, cookie);
		expect(again.status).toBe(400);
		expect(again.body.error.code).toBe("SSO_STATE_INVALID");
	});

	test("an existing account with that email is the one signed in, and joins the team", async () => {
		const dnsRecords: Record<string, string[]> = {};
		const built = buildTestApp({ dnsRecords });
		const { orgId } = await configured(built, dnsRecords);
		const grace = await signUp(built.app, "grace@acme.test");

		const { state, code, cookie } = await ssoSignIn(built, "grace@acme.test");
		const done = await callback(built, { code, state }, cookie);
		expect(done.body.data.user.id).toBe(grace.userId);
		expect(await built.organizations.roleOf(orgId, grace.userId)).toBe("member");
	});

	test("refused: unverified domains, other domains, unverified emails, a wrong nonce or code", async () => {
		const dnsRecords: Record<string, string[]> = {};
		const built = buildTestApp({ dnsRecords });
		const notYet = await request(built.app, "POST", "/auth/sso/start", undefined, {
			email: "x@acme.test",
		});
		expect(notYet.status).toBe(404);
		expect(notYet.body.error.code).toBe("SSO_NOT_CONFIGURED");
		await configured(built, dnsRecords);

		const finish = async (claims: Record<string, unknown>, tamper?: (code: string) => string) => {
			const { state, code, cookie } = await ssoSignIn(built, "x@acme.test", claims);
			return callback(built, { code: tamper ? tamper(code) : code, state }, cookie);
		};
		const elsewhere = await finish({ email: "x@other.test" });
		expect([elsewhere.status, elsewhere.body.error.code]).toEqual([403, "SSO_EMAIL_NOT_ALLOWED"]);
		const unverified = await finish({ email_verified: false });
		expect([unverified.status, unverified.body.error.code]).toEqual([403, "SSO_EMAIL_NOT_ALLOWED"]);
		const replayed = await finish({ nonce: "from-another-sign-in" });
		expect([replayed.status, replayed.body.error.code]).toEqual([401, "SSO_SIGN_IN_REJECTED"]);
		const forged = await finish({}, () => "not-a-real-code");
		expect([forged.status, forged.body.error.code]).toEqual([401, "SSO_SIGN_IN_REJECTED"]);
		expect(built.authRepository.users.some((user) => user.email === "x@other.test")).toBe(false);
	});

	test("an unreachable provider is a 502 at sign-in, not a rejection", async () => {
		const dnsRecords: Record<string, string[]> = {};
		const built = buildTestApp({ dnsRecords });
		await configured(built, dnsRecords);
		built.oidc.down = true;
		const started = await request(built.app, "POST", "/auth/sso/start", undefined, {
			email: "x@acme.test",
		});
		expect([started.status, started.body.error.code]).toEqual([502, "SSO_PROVIDER_FAILED"]);
	});
});
