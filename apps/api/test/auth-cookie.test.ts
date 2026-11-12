import { describe, expect, test } from "bun:test";

import { buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1/auth";
const json = { "content-type": "application/json" };
const password = ["correct", "horse", "battery", "staple"].join(" ");

function post(app: App, path: string, body: unknown, headers: Record<string, string> = json) {
	return app.request(`${base}${path}`, {
		method: "POST",
		headers,
		body: typeof body === "string" ? body : JSON.stringify(body),
	});
}

/** `synapse_refresh=<value>; …` → value and attributes. */
function readCookie(response: Response) {
	const header = response.headers.get("set-cookie") ?? "";
	const [pair = "", ...attributes] = header.split(";").map((part) => part.trim());
	const [, value = ""] = pair.split("=");
	return { header, value, attributes: attributes.map((a) => a.toLowerCase()) };
}

async function cookieSignUp(app: App) {
	const response = await post(app, "/sign-up", {
		email: "ada@example.com",
		password,
		session: "cookie",
	});
	expect(response.status).toBe(201);
	return { response, body: await response.json(), cookie: readCookie(response) };
}

describe("cookie sessions (ADR-0007)", () => {
	test("sign-up with session: cookie sets an httpOnly, strict, auth-scoped cookie and omits the token from the body", async () => {
		const { app } = buildTestApp();
		const { body, cookie } = await cookieSignUp(app);

		expect(cookie.header).toStartWith("synapse_refresh=");
		expect(cookie.value.length).toBeGreaterThan(20);
		expect(cookie.attributes).toEqual(
			expect.arrayContaining(["httponly", "samesite=strict", "path=/api/v1/auth"]),
		);
		expect(cookie.attributes.some((attribute) => attribute.startsWith("expires="))).toBe(true);
		expect(body.data.tokens.accessToken).toBeString();
		expect(body.data.tokens).not.toHaveProperty("refreshToken");
		expect(JSON.stringify(body)).not.toContain(cookie.value);
	});

	test("refresh reads the cookie and rotates it; within the grace window the old cookie renews only the access token; after it, reuse revokes the session", async () => {
		const { app, authRepository } = buildTestApp();
		const { cookie: first } = await cookieSignUp(app);

		const refreshed = await post(
			app,
			"/refresh",
			{},
			{ ...json, cookie: `synapse_refresh=${first.value}` },
		);
		expect(refreshed.status).toBe(200);
		const second = readCookie(refreshed);
		expect(second.value).not.toBe(first.value);
		const body = await refreshed.json();
		expect(body.data.accessToken).toBeString();
		expect(body.data).not.toHaveProperty("refreshToken");

		// Another tab still sending the first cookie a moment later: access token only, cookie untouched.
		const racing = await post(
			app,
			"/refresh",
			{},
			{ ...json, cookie: `synapse_refresh=${first.value}` },
		);
		expect(racing.status).toBe(200);
		expect(racing.headers.get("set-cookie")).toBeNull();
		expect((await racing.json()).data.accessToken).toBeString();

		// Replaying the first cookie later: reuse → the whole session is revoked and the cookie cleared.
		for (const session of authRepository.sessions) {
			if (session.rotatedAt) session.rotatedAt = new Date(Date.now() - 11_000);
		}
		const replay = await post(
			app,
			"/refresh",
			{},
			{ ...json, cookie: `synapse_refresh=${first.value}` },
		);
		expect(replay.status).toBe(401);
		expect(readCookie(replay).header).toContain("synapse_refresh=;");
		const afterRevoke = await post(
			app,
			"/refresh",
			{},
			{ ...json, cookie: `synapse_refresh=${second.value}` },
		);
		expect(afterRevoke.status).toBe(401);
	});

	test("a cookie refresh needs a JSON body: a form-style cross-site request is refused", async () => {
		const { app } = buildTestApp();
		const { cookie } = await cookieSignUp(app);
		const forged = await post(app, "/refresh", "refreshToken=", {
			"content-type": "application/x-www-form-urlencoded",
			cookie: `synapse_refresh=${cookie.value}`,
		});
		expect(forged.status).toBeGreaterThanOrEqual(400);
		expect(forged.status).toBeLessThan(500);
		// The cookie still works for the real console.
		const real = await post(
			app,
			"/refresh",
			{},
			{ ...json, cookie: `synapse_refresh=${cookie.value}` },
		);
		expect(real.status).toBe(200);
	});

	test("no body token and no cookie is a 401", async () => {
		const { app } = buildTestApp();
		const response = await post(app, "/refresh", {});
		expect(response.status).toBe(401);
		expect((await response.json()).error.code).toBe("AUTH_REFRESH_TOKEN_INVALID");
	});

	test("sign-out clears the cookie and ends the session", async () => {
		const { app } = buildTestApp();
		const { body, cookie } = await cookieSignUp(app);
		const out = await post(
			app,
			"/sign-out",
			{},
			{
				...json,
				authorization: `Bearer ${body.data.tokens.accessToken}`,
				cookie: `synapse_refresh=${cookie.value}`,
			},
		);
		expect(out.status).toBe(200);
		expect(readCookie(out).header).toContain("synapse_refresh=;");
		const refresh = await post(
			app,
			"/refresh",
			{},
			{ ...json, cookie: `synapse_refresh=${cookie.value}` },
		);
		expect(refresh.status).toBe(401);
	});

	test("the default body transport is unchanged and sets no cookie", async () => {
		const { app } = buildTestApp();
		const response = await post(app, "/sign-up", { email: "bob@example.com", password });
		expect(response.headers.get("set-cookie")).toBeNull();
		expect((await response.json()).data.tokens.refreshToken).toBeString();
	});

	test("CORS lets the configured console send credentials, and no one else", async () => {
		const { app } = buildTestApp();
		const preflight = (origin: string) =>
			app.request(`${base}/refresh`, {
				method: "OPTIONS",
				headers: {
					origin,
					"access-control-request-method": "POST",
					"access-control-request-headers": "content-type",
				},
			});
		const console = await preflight("http://localhost:3000");
		expect(console.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
		expect(console.headers.get("access-control-allow-credentials")).toBe("true");
		const other = await preflight("https://evil.example");
		expect(other.headers.get("access-control-allow-origin")).toBeNull();
	});
});
