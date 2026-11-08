import { describe, expect, test } from "bun:test";

import { buildTestApp } from "./helpers";

describe("openapi", () => {
	const { app } = buildTestApp();

	test("serves an OpenAPI 3.1 document with every route and bearer auth", async () => {
		const response = await app.request("/api/openapi.json");
		expect(response.status).toBe(200);
		const doc = await response.json();
		expect(doc.openapi).toBe("3.1.0");
		expect(Object.keys(doc.paths).toSorted()).toEqual([
			"/api/v1/audit/events",
			"/api/v1/auth/me",
			"/api/v1/auth/password/forgot",
			"/api/v1/auth/password/reset",
			"/api/v1/auth/refresh",
			"/api/v1/auth/sign-in",
			"/api/v1/auth/sign-out",
			"/api/v1/auth/sign-up",
			"/api/v1/auth/verify-email",
			"/api/v1/auth/verify-email/resend",
			"/api/v1/chat",
			"/api/v1/health",
			"/api/v1/health/ready",
			"/api/v1/oversight/approvals",
			"/api/v1/oversight/approvals/{id}/approve",
			"/api/v1/oversight/approvals/{id}/reject",
			"/api/v1/oversight/feedback",
			"/api/v1/rag/documents",
			"/api/v1/rag/documents/purge",
			"/api/v1/rag/documents/{id}",
			"/api/v1/rag/query",
		]);
		expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
			type: "http",
			scheme: "bearer",
		});
	});

	test("serves the Scalar API reference", async () => {
		const response = await app.request("/api/docs");
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("/api/openapi.json");
	});

	test("readiness reports database failures as 503", async () => {
		const failing = buildTestApp({
			pingDatabase: async () => {
				throw new Error("down");
			},
		});
		const response = await failing.app.request("/api/v1/health/ready");
		expect(response.status).toBe(503);
		expect((await response.json()).error.code).toBe("DATABASE_UNAVAILABLE");
		expect((await app.request("/api/v1/health/ready")).status).toBe(200);
	});

	test("unknown routes use the error envelope", async () => {
		const response = await app.request("/api/v1/nope");
		expect(response.status).toBe(404);
		expect((await response.json()).error.code).toBe("NOT_FOUND");
	});
});
