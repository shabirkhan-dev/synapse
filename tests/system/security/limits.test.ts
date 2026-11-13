import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { type Account, call, clientIp, signUp } from "../support/client";
import { SYSTEM } from "../support/env";
import { listRoutes, type Route } from "../support/routes";
import { type Stack, startStack } from "../support/stack";

let stack: Stack;
let ada: Account;
let routes: Route[];

beforeAll(async () => {
	stack = await startStack();
	ada = await signUp("limits");
	routes = await listRoutes();
});

afterAll(() => stack?.stop());

const preflight = (origin: string) =>
	fetch(`${SYSTEM.apiUrl}/auth/refresh`, {
		method: "OPTIONS",
		headers: { origin, "access-control-request-method": "POST" },
	});

/** Larger than anything the API accepts (2 MiB document uploads). */
const OVERSIZED = JSON.stringify({ content: "x".repeat(2 * 1024 * 1024 + 1) });

describe("input limits", () => {
	test("every write route rejects an oversized body with 413", async () => {
		const writes = routes.filter((route) => route.method === "POST");
		expect(writes.length).toBeGreaterThan(15);
		for (const route of writes) {
			// oxlint-disable-next-line no-await-in-loop -- one route at a time keeps failures readable
			const reply = await call(route.path, {
				method: route.method,
				token: ada.accessToken,
				rawBody: OVERSIZED,
				headers: { "x-forwarded-for": clientIp() },
			});
			expect({ route: `${route.method} ${route.path}`, status: reply.status }).toEqual({
				route: `${route.method} ${route.path}`,
				status: 413,
			});
			expect(reply.body.error?.code).toBe("PAYLOAD_TOO_LARGE");
		}
	});

	test("malformed JSON is a client error with the envelope and no stack trace", async () => {
		const reply = await call("/rag/query", {
			method: "POST",
			token: ada.accessToken,
			rawBody: '{"query": ',
		});
		expect(reply.status).toBeGreaterThanOrEqual(400);
		expect(reply.status).toBeLessThan(500);
		expect(reply.body.success).toBe(false);
		expect(JSON.stringify(reply.body)).not.toMatch(/\bat .+:\d+:\d+/);
	});

	test("sign-in is rate limited per email", async () => {
		const ip = clientIp();
		const attempt = () =>
			call("/auth/sign-in", {
				method: "POST",
				body: { email: ada.email, password: "wrong-password-attempt" },
				headers: { "x-forwarded-for": ip },
			});
		const statuses: number[] = [];
		for (let index = 0; index < 11; index++) {
			// oxlint-disable-next-line no-await-in-loop -- the limit counts attempts in order
			statuses.push((await attempt()).status);
		}
		expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
		const limited = await attempt();
		expect(limited.status).toBe(429);
		expect(limited.body.error?.code).toBe("AUTH_RATE_LIMITED");
	});
});

describe("headers", () => {
	test("responses carry security headers and the server does not name itself", async () => {
		const response = await fetch(`${SYSTEM.apiUrl}/health`);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
		expect(response.headers.get("strict-transport-security")).toContain("max-age=");
		expect(response.headers.get("x-powered-by")).toBeNull();
	});

	test("CORS allows the configured console origin only", async () => {
		const allowed = await preflight("http://localhost:3200");
		expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3200");
		expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");
		const other = await preflight("https://attacker.example");
		expect(other.headers.get("access-control-allow-origin")).toBeNull();
	});
});
