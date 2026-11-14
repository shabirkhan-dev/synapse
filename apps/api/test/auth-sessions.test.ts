import { describe, expect, test } from "bun:test";

import { buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];

const base = "http://localhost/api/v1/auth";
const credentials = { email: "ada@example.com", password: "correct horse battery staple" };
const FIREFOX = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6) Gecko/20100101 Firefox/140.0";
const IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.1 Mobile Safari/604.1";

async function signIn(app: App, path: "/sign-up" | "/sign-in", userAgent: string) {
	const response = await app.request(`${base}${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", "user-agent": userAgent },
		body: JSON.stringify(credentials),
	});
	expect(response.status).toBeLessThan(300);
	return (await response.json()).data.tokens as { accessToken: string; refreshToken: string };
}

const call = (app: App, method: string, path: string, token: string) =>
	app.request(`${base}${path}`, { method, headers: { authorization: `Bearer ${token}` } });

const refresh = (app: App, refreshToken: string) =>
	app.request(`${base}/refresh`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ refreshToken }),
	});

describe("auth sessions", () => {
	test("lists your sessions with their browser, marks this one, and signs out another", async () => {
		const { app } = buildTestApp();
		const laptop = await signIn(app, "/sign-up", FIREFOX);
		const phone = await signIn(app, "/sign-in", IPHONE);

		const listed = await call(app, "GET", "/sessions", laptop.accessToken);
		expect(listed.status).toBe(200);
		const sessions = (await listed.json()).data as {
			id: string;
			userAgent: string;
			current: boolean;
		}[];
		expect(sessions).toHaveLength(2);
		expect(sessions.find((s) => s.current)?.userAgent).toBe(FIREFOX);
		const other = sessions.find((s) => !s.current);
		expect(other?.userAgent).toBe(IPHONE);
		expect(JSON.stringify(sessions)).not.toContain(phone.refreshToken);

		const revoked = await call(app, "DELETE", `/sessions/${other?.id}`, laptop.accessToken);
		expect(revoked.status).toBe(200);
		// The phone's refresh token no longer works; the laptop's still does.
		expect((await refresh(app, phone.refreshToken)).status).toBe(401);
		expect((await refresh(app, laptop.refreshToken)).status).toBe(200);
		// Signing it out twice, or a session that is not yours, is a 404.
		const again = await call(app, "DELETE", `/sessions/${other?.id}`, laptop.accessToken);
		expect(again.status).toBe(404);
		expect((await again.json()).error.code).toBe("AUTH_SESSION_NOT_FOUND");
	});

	test("signs out every other session and keeps this one", async () => {
		const { app } = buildTestApp();
		const here = await signIn(app, "/sign-up", FIREFOX);
		const elsewhere = [
			await signIn(app, "/sign-in", IPHONE),
			await signIn(app, "/sign-in", "curl/8"),
		];

		const response = await call(app, "POST", "/sessions/revoke-others", here.accessToken);
		expect(response.status).toBe(200);
		expect((await response.json()).data).toEqual({ revoked: 2 });
		for (const session of elsewhere) {
			// oxlint-disable-next-line no-await-in-loop
			expect((await refresh(app, session.refreshToken)).status).toBe(401);
		}
		const left = (await (await call(app, "GET", "/sessions", here.accessToken)).json()).data;
		expect(left).toHaveLength(1);
		expect(left[0].current).toBe(true);
	});

	test("another user cannot sign out your session", async () => {
		const { app } = buildTestApp();
		await signIn(app, "/sign-up", FIREFOX);
		const mine = (
			await (
				await call(app, "GET", "/sessions", (await signIn(app, "/sign-in", FIREFOX)).accessToken)
			).json()
		).data[0].id;
		const bob = await app.request(`${base}/sign-up`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email: "bob@example.com", password: credentials.password }),
		});
		const bobToken = (await bob.json()).data.tokens.accessToken;
		expect((await call(app, "DELETE", `/sessions/${mine}`, bobToken)).status).toBe(404);
	});

	test("session routes need a bearer token", async () => {
		const { app } = buildTestApp();
		expect((await app.request(`${base}/sessions`)).status).toBe(401);
		expect((await app.request(`${base}/sessions/revoke-others`, { method: "POST" })).status).toBe(
			401,
		);
	});

	test("a signed-out or revoked session's access token stops working at once", async () => {
		const { app } = buildTestApp();
		const laptop = await signIn(app, "/sign-up", FIREFOX);
		const phone = await signIn(app, "/sign-in", IPHONE);
		const tablet = await signIn(app, "/sign-in", IPHONE);

		// Signing out ends this session's access token too, not only its refresh token.
		const out = await app.request(`${base}/sign-out`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${tablet.accessToken}`,
			},
			body: JSON.stringify({ refreshToken: tablet.refreshToken }),
		});
		expect(out.status).toBe(200);
		const afterSignOut = await call(app, "GET", "/me", tablet.accessToken);
		expect(afterSignOut.status).toBe(401);
		expect((await afterSignOut.json()).error.code).toBe("AUTH_SESSION_ENDED");

		// "Sign out everywhere else" ends the phone at once; the laptop keeps working.
		expect((await call(app, "GET", "/me", phone.accessToken)).status).toBe(200);
		expect((await call(app, "POST", "/sessions/revoke-others", laptop.accessToken)).status).toBe(
			200,
		);
		expect((await call(app, "GET", "/me", phone.accessToken)).status).toBe(401);
		expect((await call(app, "GET", "/me", laptop.accessToken)).status).toBe(200);
	});
});
