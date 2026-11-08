import { describe, expect, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

import { authHeaders, buildTestApp, textGenerateResult } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";

async function call(
	app: App,
	method: string,
	path: string,
	{ user = "user-1", body, requestId }: { user?: string; body?: unknown; requestId?: string } = {},
) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: { ...(await authHeaders(user)), ...(requestId ? { "x-request-id": requestId } : {}) },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

const refundDoc = { title: "Refund policy", content: "Refunds are accepted within 30 days." };

describe("audit trail", () => {
	test("an answered query is recorded once with its provenance, request id and redacted text", async () => {
		const chatModel = new MockLanguageModelV4({ doGenerate: textGenerateResult("30 days [1].") });
		const { app, auditEvents } = buildTestApp({ chatModel });
		await call(app, "POST", "/rag/documents", { body: refundDoc });

		const query = await call(app, "POST", "/rag/query", {
			requestId: "req_audit_1",
			body: { query: "refunds for ada@example.com?" },
		});
		expect(query.status).toBe(200);

		const answered = auditEvents.events.filter((e) => e.action === "rag.query.answered");
		expect(answered).toHaveLength(1);
		expect(answered[0]).toMatchObject({
			ownerId: "user-1",
			actorId: "user-1",
			requestId: "req_audit_1",
			data: {
				question: "refunds for [email]?",
				answer: "30 days [1].",
				citedChunkIds: [query.body.data.matches[0].chunkId],
			},
			provenance: { promptVersion: "rag-answer@1", chatModel: "mock:mock-chat" },
		});
	});

	test("searches without an answer and queries with no documents are not answers", async () => {
		const { app, auditEvents } = buildTestApp();
		await call(app, "POST", "/rag/query", { body: { query: "anything" } });
		await call(app, "POST", "/rag/documents", { body: refundDoc });
		await call(app, "POST", "/rag/query", { body: { query: "refunds", answer: false } });
		expect(auditEvents.events.filter((e) => e.action === "rag.query.answered")).toEqual([]);
	});

	test("ingest (not duplicates) and delete are recorded", async () => {
		const { app, auditEvents } = buildTestApp();
		const created = await call(app, "POST", "/rag/documents", { body: refundDoc });
		await call(app, "POST", "/rag/documents", { body: refundDoc });
		await call(app, "DELETE", `/rag/documents/${created.body.data.id}`);
		expect(auditEvents.events.map((e) => [e.action, e.subjectId])).toEqual([
			["rag.document.ingested", created.body.data.id],
			["rag.document.deleted", created.body.data.id],
		]);
	});

	test("sign-up, sign-in and sign-out are recorded for the user", async () => {
		const { app, auditEvents } = buildTestApp();
		const credentials = {
			email: "ada@example.com",
			password: ["a", "long", "test", "passphrase"].join(" "),
		};
		const post = (path: string, body: unknown, token?: string) =>
			app.request(`${base}/auth${path}`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...(token ? { authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(body),
			});
		const signedUp = (await (await post("/sign-up", credentials)).json()).data;
		await post("/sign-in", credentials);
		await post("/sign-out", {}, signedUp.tokens.accessToken);
		expect(auditEvents.events.map((e) => e.action)).toEqual([
			"auth.user.signed_up",
			"auth.user.signed_in",
			"auth.session.signed_out",
		]);
		expect(auditEvents.events.every((e) => e.ownerId === signedUp.user.id)).toBe(true);
		expect(JSON.stringify(auditEvents.events)).not.toContain(credentials.password);
	});

	test("approval requests and decisions are recorded; a repeated decision is not", async () => {
		const { app, auditEvents } = buildTestApp();
		await call(app, "POST", "/rag/documents", { body: refundDoc });
		const { body } = await call(app, "POST", "/rag/documents/purge");
		await call(app, "POST", `/oversight/approvals/${body.data.id}/approve`, {
			requestId: "req_ok",
		});
		await call(app, "POST", `/oversight/approvals/${body.data.id}/approve`);
		expect(auditEvents.events.map((e) => e.action)).toEqual([
			"rag.document.ingested",
			"oversight.approval.requested",
			"rag.documents.purged",
			"oversight.approval.decided",
		]);
		expect(auditEvents.events.at(-1)).toMatchObject({
			subjectId: body.data.id,
			requestId: "req_ok",
			data: { approved: true, outcome: "done" },
		});
	});

	test("GET /audit/events shows only your events, newest first, filterable by action", async () => {
		const { app } = buildTestApp();
		await call(app, "POST", "/rag/documents", { body: refundDoc });
		await call(app, "POST", "/rag/documents", { user: "user-2", body: refundDoc });
		const created = await call(app, "POST", "/rag/documents", {
			body: { title: "Shipping", content: "Ships in 3 days." },
		});
		await call(app, "DELETE", `/rag/documents/${created.body.data.id}`);

		const mine = await call(app, "GET", "/audit/events");
		expect(mine.body.data.map((e: { action: string }) => e.action)).toEqual([
			"rag.document.deleted",
			"rag.document.ingested",
			"rag.document.ingested",
		]);
		expect(mine.body.data[0]).not.toHaveProperty("ownerId");
		const deletes = await call(app, "GET", "/audit/events?action=rag.document.deleted&limit=5");
		expect(deletes.body.data).toHaveLength(1);
		expect((await app.request(`${base}/audit/events`)).status).toBe(401);
	});
});
