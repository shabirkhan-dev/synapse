import { describe, expect, test } from "bun:test";
import { createAuditLog } from "@synapse/audit";

import { ApiKeysService } from "@/modules/auth";

import { buildTestApp, InMemoryApiKeyStore, InMemoryAuditStore } from "./helpers";

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

/** Ada owns a team, Bob is a member signed in to it. */
async function team(app: App) {
	const ada = await signUp(app, "ada@example.com");
	const bob = await signUp(app, "bob@example.com");
	const orgId = (await request(app, "POST", "/organizations", ada.token, { name: "Support" })).body
		.data.id as string;
	await request(app, "POST", `/organizations/${orgId}/members`, ada.token, {
		email: "bob@example.com",
		role: "member",
	});
	const bobTeam = (
		await request(app, "POST", "/auth/switch-organization", bob.token, { organizationId: orgId })
	).body.data.accessToken as string;
	return { ada, bob, bobTeam, orgId };
}

describe("personal API keys", () => {
	test("a key made in a team acts as its user there; it is shown once and listed without it", async () => {
		const { app, auditEvents } = buildTestApp();
		const { bob, bobTeam, orgId } = await team(app);
		await request(app, "POST", "/rag/documents", bobTeam, {
			title: "Handbook",
			content: "Refunds are accepted within 30 days.",
		});

		const created = await request(app, "POST", "/auth/api-keys", bobTeam, {
			name: "Nightly import",
		});
		expect(created.status).toBe(201);
		const { key, apiKey } = created.body.data;
		expect(key).toStartWith("syn_");
		expect(apiKey).toMatchObject({
			name: "Nightly import",
			organizationId: orgId,
			expiresAt: null,
		});
		expect(key.startsWith(apiKey.prefix)).toBe(true);

		const listed = await request(app, "GET", "/auth/api-keys", bobTeam);
		expect(listed.body.data).toHaveLength(1);
		expect(JSON.stringify(listed.body)).not.toContain(key);

		// The key reads the team's documents and asks as Bob, a member.
		const documents = await request(app, "GET", "/rag/documents", key);
		expect(documents.status).toBe(200);
		expect(documents.body.data.map((d: { title: string }) => d.title)).toEqual(["Handbook"]);
		const me = await request(app, "GET", "/auth/me", key);
		expect(me.body.data).toMatchObject({
			id: bob.userId,
			organization: { id: orgId, role: "member" },
		});
		const used = await request(app, "GET", "/auth/api-keys", bobTeam);
		expect(used.body.data[0].lastUsedAt).not.toBeNull();
		expect(auditEvents.events.some((e) => e.action === "auth.api_key.created")).toBe(true);
	});

	test("a key cannot manage keys, sessions or organizations", async () => {
		const { app } = buildTestApp();
		const { bobTeam } = await team(app);
		const { key } = (await request(app, "POST", "/auth/api-keys", bobTeam, { name: "ci" })).body
			.data;
		for (const [method, path, body] of [
			["GET", "/auth/api-keys", undefined],
			["POST", "/auth/api-keys", { name: "another" }],
			["GET", "/auth/sessions", undefined],
			["POST", "/auth/sessions/revoke-others", {}],
			["POST", "/auth/sign-out", {}],
		] as const) {
			// oxlint-disable-next-line no-await-in-loop -- one route at a time
			const refused = await request(app, method, path, key, body);
			expect(refused.status, `${method} ${path}`).toBe(403);
			expect(refused.body.error.code).toBe("AUTH_SESSION_REQUIRED");
		}
	});

	test("a revoked key, and a key whose user left the team, stop working at once", async () => {
		const { app, auditEvents } = buildTestApp();
		const { ada, bob, bobTeam, orgId } = await team(app);
		const first = (await request(app, "POST", "/auth/api-keys", bobTeam, { name: "one" })).body
			.data;
		const second = (await request(app, "POST", "/auth/api-keys", bobTeam, { name: "two" })).body
			.data;

		expect(
			(await request(app, "DELETE", `/auth/api-keys/${first.apiKey.id}`, bobTeam)).status,
		).toBe(200);
		const revoked = await request(app, "GET", "/rag/documents", first.key);
		expect(revoked.status).toBe(401);
		expect(revoked.body.error.code).toBe("AUTH_API_KEY_INVALID");
		expect(auditEvents.events.some((e) => e.action === "auth.api_key.revoked")).toBe(true);
		// Someone else's key id is not found.
		expect(
			(await request(app, "DELETE", `/auth/api-keys/${second.apiKey.id}`, ada.token)).status,
		).toBe(404);

		await request(app, "DELETE", `/organizations/${orgId}/members/${bob.userId}`, ada.token);
		const left = await request(app, "GET", "/rag/documents", second.key);
		expect(left.status).toBe(401);
		expect(left.body.error.code).toBe("AUTH_NOT_A_MEMBER");
		// An unknown key looks the same as a revoked one.
		expect((await request(app, "GET", "/rag/documents", "syn_unknown")).status).toBe(401);
	});

	test("keys expire, and a user holds at most 20", async () => {
		let now = new Date("2026-11-21T10:00:00Z");
		const store = new InMemoryApiKeyStore();
		const keys = new ApiKeysService({
			store,
			roleOf: async () => "owner",
			audit: createAuditLog({ store: new InMemoryAuditStore(), redact: (data) => data }),
			now: () => now,
		});
		const user = {
			sub: "u1",
			sid: "s1",
			orgId: "u1",
			role: "owner" as const,
			via: "session" as const,
		};
		const { key } = await keys.create(
			user,
			{ name: "week", expiresInDays: 7 },
			{ requestId: null },
		);
		expect((await keys.authenticate(key)).via).toBe("api_key");
		now = new Date("2026-11-28T10:00:01Z");
		await expect(keys.authenticate(key)).rejects.toMatchObject({ code: "AUTH_API_KEY_INVALID" });

		for (let index = store.keys.length; index < 20; index += 1) {
			// oxlint-disable-next-line no-await-in-loop -- one at a time
			await keys.create(user, { name: `k${index}` }, { requestId: null });
		}
		await expect(
			keys.create(user, { name: "one too many" }, { requestId: null }),
		).rejects.toMatchObject({ code: "AUTH_TOO_MANY_API_KEYS" });
	});
});
