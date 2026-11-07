import { describe, expect, test } from "bun:test";

import { authHeaders, buildTestApp, signAccessToken } from "./helpers";

const url = "http://localhost/api/v1/rag/documents";

describe("auth (nest-api access tokens)", () => {
	const { app } = buildTestApp();

	test("health is public", async () => {
		const response = await app.request("/api/v1/health");
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			success: true,
			data: { status: "ok", service: "starter-ai-api" },
		});
		expect(response.headers.get("x-request-id")).toMatch(/^req_/);
	});

	test("rejects a missing token with the shared error envelope", async () => {
		const response = await app.request(url);
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({
			success: false,
			statusCode: 401,
			code: "AUTH_ACCESS_TOKEN_MISSING",
			path: "/api/v1/rag/documents",
			method: "GET",
		});
	});

	test("rejects a token signed with another secret", async () => {
		const token = await signAccessToken(undefined, { secret: "y".repeat(40) });
		const response = await app.request(url, { headers: { authorization: `Bearer ${token}` } });
		expect(response.status).toBe(401);
		expect((await response.json()).code).toBe("AUTH_ACCESS_TOKEN_INVALID");
	});

	test("rejects an expired token", async () => {
		const token = await signAccessToken(undefined, { expiresIn: "-1m" });
		const response = await app.request(url, { headers: { authorization: `Bearer ${token}` } });
		expect(response.status).toBe(401);
	});

	test("rejects a token without the sid claim", async () => {
		const token = await signAccessToken({ sub: "user-1" });
		const response = await app.request(url, { headers: { authorization: `Bearer ${token}` } });
		expect(response.status).toBe(401);
	});

	test("accepts a nest-style HS256 token", async () => {
		const response = await app.request(url, { headers: await authHeaders() });
		expect(response.status).toBe(200);
		expect((await response.json()).data).toEqual([]);
	});

	test("chat is protected too", async () => {
		const response = await app.request("/api/v1/chat", { method: "POST", body: "{}" });
		expect(response.status).toBe(401);
	});
});
