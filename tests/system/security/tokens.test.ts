import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createAccessTokens } from "@synapse/security";

import { type Account, call, signUp } from "../support/client";
import { SYSTEM } from "../support/env";
import { listRoutes, type Route } from "../support/routes";
import { type Stack, startStack } from "../support/stack";

let stack: Stack;
let ada: Account;
let routes: Route[];

beforeAll(async () => {
	// A 1 s reuse grace window keeps the refresh-reuse test short.
	stack = await startStack({ AUTH_REFRESH_REUSE_GRACE_SECONDS: "1" });
	ada = await signUp("tokens");
	routes = await listRoutes();
});

afterAll(() => stack?.stop());

const base64url = (value: string) => Buffer.from(value).toString("base64url");

async function refresh(refreshToken: string) {
	return call<{ accessToken: string; refreshToken?: string }>("/auth/refresh", {
		method: "POST",
		body: { refreshToken },
	});
}

describe("access tokens", () => {
	test("every protected route in the OpenAPI document refuses a request without a token", async () => {
		const protectedRoutes = routes.filter((route) => route.isProtected);
		expect(protectedRoutes.length).toBeGreaterThan(20);
		for (const route of protectedRoutes) {
			// oxlint-disable-next-line no-await-in-loop -- one route at a time keeps failures readable
			const reply = await call(route.path, {
				method: route.method,
				body: route.method === "GET" || route.method === "DELETE" ? undefined : {},
			});
			expect({ route: `${route.method} ${route.path}`, status: reply.status }).toEqual({
				route: `${route.method} ${route.path}`,
				status: 401,
			});
		}
	});

	test("tampered, unsigned, foreign and expired tokens are refused", async () => {
		const [header, payload, signature] = ada.accessToken.split(".");
		const claims = JSON.parse(Buffer.from(payload ?? "", "base64url").toString()) as object;
		const otherUser = { ...claims, sub: "00000000-0000-4000-8000-000000000000" };
		const tampered = `${header}.${base64url(JSON.stringify(otherUser))}.${signature}`;
		const unsigned = `${base64url('{"alg":"none","typ":"JWT"}')}.${payload}.`;
		const foreign = await createAccessTokens({
			secret: "another-secret-that-is-at-least-32-characters",
			ttlSeconds: 300,
		}).issue(claims as { sub: string; sid: string });
		const expired = await createAccessTokens({ secret: SYSTEM.jwtSecret, ttlSeconds: 60 }).issue(
			claims as { sub: string; sid: string },
			new Date(Date.now() - 3_600_000),
		);
		for (const token of [tampered, unsigned, foreign.token, expired.token, "not-a-jwt"]) {
			// oxlint-disable-next-line no-await-in-loop -- sequential keeps the failing token obvious
			const reply = await call("/auth/me", { token });
			expect(reply.status).toBe(401);
			expect(reply.body.error?.code).toBe("AUTH_ACCESS_TOKEN_INVALID");
		}
		expect((await call("/auth/me", { token: ada.accessToken })).status).toBe(200);
	});
});

describe("refresh tokens", () => {
	test("reusing a replaced refresh token after the grace window revokes the session", async () => {
		const account = await signUp("reuse");
		const first = await refresh(account.refreshToken);
		expect(first.status).toBe(200);
		const rotated = first.body.data.refreshToken ?? "";
		await Bun.sleep(1_500);

		const reused = await refresh(account.refreshToken);
		expect(reused.status).toBe(401);
		// The thief's replay also ends the rightful holder's session.
		expect((await refresh(rotated)).status).toBe(401);
	});

	test("a signed-out session cannot be refreshed, and its access token stops at once", async () => {
		const account = await signUp("signout");
		const out = await call("/auth/sign-out", {
			method: "POST",
			token: account.accessToken,
			body: { refreshToken: account.refreshToken },
		});
		expect(out.status).toBeLessThan(300);
		expect((await refresh(account.refreshToken)).status).toBe(401);
		const me = await call("/auth/me", { token: account.accessToken });
		expect(me.status).toBe(401);
		expect(me.body.error?.code).toBe("AUTH_SESSION_ENDED");
	});
});
