import { describe, expect, test } from "bun:test";

import { buildTestApp } from "./helpers";

const base = "http://localhost/api/v1/auth";
const json = { "content-type": "application/json" };
const credentials = { email: "Ada@Example.com ", password: "correct horse battery staple" };

function post(
	app: ReturnType<typeof buildTestApp>["app"],
	path: string,
	body: unknown,
	token?: string,
) {
	return app.request(`${base}${path}`, {
		method: "POST",
		headers: token ? { ...json, authorization: `Bearer ${token}` } : json,
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

async function signUp(app: ReturnType<typeof buildTestApp>["app"]) {
	const response = await post(app, "/sign-up", credentials);
	expect(response.status).toBe(201);
	return (await response.json()).data;
}

describe("auth flow", () => {
	test("sign-up creates the account, normalizes the email and opens a session", async () => {
		const { app, authRepository } = buildTestApp();
		const { user, tokens } = await signUp(app);
		expect(user).toMatchObject({ email: "ada@example.com" });
		expect(user).not.toHaveProperty("passwordHash");
		expect(tokens).toMatchObject({ tokenType: "Bearer" });
		// Only hashes are stored: neither the password nor the refresh token.
		const [stored] = authRepository.users;
		expect(stored?.passwordHash).toStartWith("$argon2id$");
		expect(JSON.stringify(authRepository.sessions)).not.toContain(tokens.refreshToken);

		const me = await app.request(`${base}/me`, {
			headers: { authorization: `Bearer ${tokens.accessToken}` },
		});
		expect(me.status).toBe(200);
		// The personal organization (id = user id) is active until the user switches.
		expect((await me.json()).data).toEqual({
			...user,
			organization: { id: user.id, role: "owner" },
		});
	});

	test("the access token works on protected routes, scoped to the new user", async () => {
		const { app } = buildTestApp();
		const { tokens } = await signUp(app);
		const response = await app.request("http://localhost/api/v1/rag/documents", {
			headers: { authorization: `Bearer ${tokens.accessToken}` },
		});
		expect(response.status).toBe(200);
		expect((await response.json()).data).toEqual([]);
	});

	test("rejects a second account with the same email in any case", async () => {
		const { app } = buildTestApp();
		await signUp(app);
		const response = await post(app, "/sign-up", { ...credentials, email: "ADA@example.com" });
		expect(response.status).toBe(409);
		expect((await response.json()).error.code).toBe("AUTH_EMAIL_TAKEN");
	});

	test("sign-in succeeds with the right password and gives one answer for every failure", async () => {
		const { app } = buildTestApp();
		await signUp(app);
		const ok = await post(app, "/sign-in", {
			email: "ada@example.com",
			password: credentials.password,
		});
		expect(ok.status).toBe(200);
		expect((await ok.json()).data.tokens.accessToken).toBeString();

		const wrongPassword = await post(app, "/sign-in", { ...credentials, password: "nope" });
		const unknownEmail = await post(app, "/sign-in", { ...credentials, email: "eve@example.com" });
		const bodies = await Promise.all([wrongPassword.json(), unknownEmail.json()]);
		expect([wrongPassword.status, unknownEmail.status]).toEqual([401, 401]);
		for (const body of bodies) {
			expect(body).toMatchObject({
				message: "Email or password is incorrect",
				error: { code: "AUTH_INVALID_CREDENTIALS" },
			});
		}
	});

	test("refresh rotates the token; replaying the old one after the grace window revokes the session", async () => {
		const { app, authRepository } = buildTestApp();
		const { tokens } = await signUp(app);

		const first = await post(app, "/refresh", { refreshToken: tokens.refreshToken });
		expect(first.status).toBe(200);
		const rotated = (await first.json()).data;
		expect(rotated.refreshToken).not.toBe(tokens.refreshToken);
		expect(rotated.refreshTokenExpiresAt).toBe(tokens.refreshTokenExpiresAt);

		// Right after the rotation (another tab, a retry): an access token, but no new refresh token.
		const racing = await post(app, "/refresh", { refreshToken: tokens.refreshToken });
		expect(racing.status).toBe(200);
		const renewed = (await racing.json()).data;
		expect(renewed.accessToken).toBeString();
		expect(renewed).not.toHaveProperty("refreshToken");

		// Later, someone replays the old token: it fails, and the stolen session dies for everyone.
		for (const session of authRepository.sessions) {
			if (session.rotatedAt) session.rotatedAt = new Date(Date.now() - 11_000);
		}
		const replay = await post(app, "/refresh", { refreshToken: tokens.refreshToken });
		expect(replay.status).toBe(401);
		expect((await replay.json()).error.code).toBe("AUTH_REFRESH_TOKEN_INVALID");
		const afterReplay = await post(app, "/refresh", { refreshToken: rotated.refreshToken });
		expect(afterReplay.status).toBe(401);
	});

	test("two refreshes with the same token at once both succeed, and only one rotates", async () => {
		const { app } = buildTestApp();
		const { tokens } = await signUp(app);
		const [a, b] = await Promise.all([
			post(app, "/refresh", { refreshToken: tokens.refreshToken }),
			post(app, "/refresh", { refreshToken: tokens.refreshToken }),
		]);
		expect([a.status, b.status]).toEqual([200, 200]);
		const bodies = [(await a.json()).data, (await b.json()).data];
		const withRefresh = bodies.filter((body) => body.refreshToken);
		expect(withRefresh).toHaveLength(1);
		const next = await post(app, "/refresh", { refreshToken: withRefresh[0].refreshToken });
		expect(next.status).toBe(200);
	});

	test("refresh rejects unknown and expired tokens", async () => {
		const { app, authRepository } = buildTestApp();
		const { tokens } = await signUp(app);
		expect((await post(app, "/refresh", { refreshToken: "made-up" })).status).toBe(401);

		for (const session of authRepository.sessions) session.expiresAt = new Date(Date.now() - 1000);
		expect((await post(app, "/refresh", { refreshToken: tokens.refreshToken })).status).toBe(401);
	});

	test("sign-out revokes the session's refresh token and needs an access token", async () => {
		const { app } = buildTestApp();
		const { tokens } = await signUp(app);
		expect((await post(app, "/sign-out", {})).status).toBe(401);

		const signOut = await post(app, "/sign-out", {}, tokens.accessToken);
		expect(signOut.status).toBe(200);
		expect((await signOut.json()).message).toBe("Signed out");
		expect((await post(app, "/refresh", { refreshToken: tokens.refreshToken })).status).toBe(401);
	});

	test("validates input and limits body size", async () => {
		const { app } = buildTestApp();
		const weak = await post(app, "/sign-up", { email: "ada@example.com", password: "short" });
		expect(weak.status).toBe(422);
		expect((await weak.json()).error.code).toBe("VALIDATION_ERROR");
		expect(
			(await post(app, "/sign-up", { email: "not-an-email", password: credentials.password }))
				.status,
		).toBe(422);

		const huge = await post(app, "/sign-in", {
			email: "ada@example.com",
			password: "x".repeat(10_000),
		});
		expect(huge.status).toBe(413);
	});
});
