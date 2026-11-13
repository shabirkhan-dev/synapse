import { describe, expect, test } from "bun:test";

import { REQUEST_MAX_BODY_BYTES } from "@/shared/middleware/body-limit";

import { authHeaders, buildTestApp } from "./helpers";

describe("request body limit", () => {
	test("rejects a body over the cap on a route without its own limit", async () => {
		const { app } = buildTestApp();
		const response = await app.request("/api/v1/memory/facts", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ content: "x".repeat(REQUEST_MAX_BODY_BYTES) }),
		});
		expect(response.status).toBe(413);
		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
	});

	test("lets a body under the cap reach validation", async () => {
		const { app } = buildTestApp();
		const response = await app.request("/api/v1/memory/facts", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ content: "x".repeat(10_000) }),
		});
		expect(response.status).toBe(422);
	});
});
