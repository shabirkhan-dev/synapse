import { describe, expect, test } from "bun:test";

import { authHeaders, buildTestApp } from "./helpers";

const minute = (limit: number) => ({ limit, windowSeconds: 60 });

function app() {
	return buildTestApp({
		limits: { questions: minute(2), ingests: minute(1), evaluationRuns: minute(1) },
	}).app;
}

const post = async (target: ReturnType<typeof app>, path: string, body: unknown, user = "user-1") =>
	target.request(`/api/v1${path}`, {
		method: "POST",
		headers: await authHeaders(user),
		body: JSON.stringify(body),
	});

describe("per-user budgets on model-calling routes", () => {
	test("the request over the budget gets 429 with Retry-After, before any model call", async () => {
		const api = app();
		const search = { query: "refunds", answer: false };
		expect((await post(api, "/rag/query", search)).status).toBe(200);
		expect((await post(api, "/rag/query", search)).status).toBe(200);

		const limited = await post(api, "/rag/query", search);
		expect(limited.status).toBe(429);
		const retryAfter = Number(limited.headers.get("retry-after"));
		expect(retryAfter).toBeGreaterThan(0);
		expect(retryAfter).toBeLessThanOrEqual(60);
		const body = (await limited.json()) as {
			message: string;
			error: { code: string; details: { retryAfterSeconds: number }[] };
		};
		expect(body.error.code).toBe("RATE_LIMITED");
		expect(body.error.details[0]?.retryAfterSeconds).toBe(retryAfter);
		expect(body.message).toContain(`${retryAfter} second`);

		// Chat shares the questions budget.
		const chat = await post(api, "/chat", {
			message: { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] },
		});
		expect(chat.status).toBe(429);
	});

	test("budgets are per user and per kind; reads are not limited", async () => {
		const api = app();
		const search = { query: "refunds", answer: false };
		await post(api, "/rag/query", search);
		await post(api, "/rag/query", search);
		expect((await post(api, "/rag/query", search)).status).toBe(429);
		expect((await post(api, "/rag/query", search, "user-2")).status).toBe(200);

		// Ingests have their own budget (1 here).
		const document = { title: "Refunds", content: "Refunds within 30 days." };
		expect((await post(api, "/rag/documents", document)).status).toBe(201);
		const second = await post(api, "/rag/documents", { ...document, content: "Shipping." });
		expect(second.status).toBe(429);

		for (let index = 0; index < 5; index++) {
			// oxlint-disable-next-line no-await-in-loop -- reading repeatedly is the point
			const list = await api.request("/api/v1/rag/documents", { headers: await authHeaders() });
			expect(list.status).toBe(200);
		}
	});
});
