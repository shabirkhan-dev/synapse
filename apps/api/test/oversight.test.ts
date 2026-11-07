import { describe, expect, test } from "bun:test";

import { authHeaders, buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";

async function call(app: App, method: string, path: string, user = "user-1", body?: unknown) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: await authHeaders(user),
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

async function ingest(app: App, user: string, title: string) {
	const { status } = await call(app, "POST", "/rag/documents", user, {
		title,
		content: `${title} content for the purge test`,
	});
	expect(status).toBe(201);
}

describe("approval-gated purge", () => {
	test("asking to purge deletes nothing; approving runs it and returns the result", async () => {
		const { app } = buildTestApp();
		await ingest(app, "user-1", "Refunds");
		await ingest(app, "user-1", "Shipping");

		const requested = await call(app, "POST", "/rag/documents/purge");
		expect(requested.status).toBe(202);
		expect(requested.body.data).toMatchObject({
			action: "rag.purge-documents",
			summary: "Delete all 2 of your documents and their chunks",
			status: "pending",
		});
		expect((await call(app, "GET", "/rag/documents")).body.data).toHaveLength(2);

		const queue = await call(app, "GET", "/oversight/approvals");
		expect(queue.body.data.map((a: { id: string }) => a.id)).toEqual([requested.body.data.id]);

		const approved = await call(
			app,
			"POST",
			`/oversight/approvals/${requested.body.data.id}/approve`,
		);
		expect(approved.status).toBe(200);
		expect(approved.body.data).toMatchObject({
			approval: { status: "approved", decidedBy: "user-1" },
			outcome: { status: "done", result: { deleted: 2 } },
		});
		expect((await call(app, "GET", "/rag/documents")).body.data).toEqual([]);
		expect((await call(app, "GET", "/oversight/approvals")).body.data).toEqual([]);
	});

	test("rejecting keeps the documents; changing the decision afterwards is refused", async () => {
		const { app } = buildTestApp();
		await ingest(app, "user-1", "Refunds");
		const { body } = await call(app, "POST", "/rag/documents/purge");
		const id = body.data.id;

		const rejected = await call(app, "POST", `/oversight/approvals/${id}/reject`, "user-1", {
			reason: "clicked by mistake",
		});
		expect(rejected.body.data).toMatchObject({
			approval: { status: "rejected", reason: "clicked by mistake" },
			outcome: { status: "rejected" },
		});
		expect((await call(app, "GET", "/rag/documents")).body.data).toHaveLength(1);

		const flip = await call(app, "POST", `/oversight/approvals/${id}/approve`);
		expect(flip.status).toBe(409);
		expect(flip.body.error.code).toBe("OVERSIGHT_APPROVAL_ALREADY_DECIDED");
		// Repeating the same decision is safe.
		expect(
			(await call(app, "POST", `/oversight/approvals/${id}/reject`, "user-1", {})).status,
		).toBe(200);
	});

	test("another user cannot see or decide the request", async () => {
		const { app } = buildTestApp();
		await ingest(app, "user-1", "Refunds");
		const { body } = await call(app, "POST", "/rag/documents/purge");

		expect((await call(app, "GET", "/oversight/approvals", "user-2")).body.data).toEqual([]);
		const stolen = await call(
			app,
			"POST",
			`/oversight/approvals/${body.data.id}/approve`,
			"user-2",
		);
		expect(stolen.status).toBe(404);
		expect((await call(app, "GET", "/rag/documents")).body.data).toHaveLength(1);
	});

	test("approving twice runs the action once", async () => {
		const { app } = buildTestApp();
		await ingest(app, "user-1", "Refunds");
		const { body } = await call(app, "POST", "/rag/documents/purge");
		await call(app, "POST", `/oversight/approvals/${body.data.id}/approve`);
		await ingest(app, "user-1", "New after purge");
		const again = await call(app, "POST", `/oversight/approvals/${body.data.id}/approve`);
		expect(again.body.data.outcome).toMatchObject({ status: "done", result: { deleted: 1 } });
		expect((await call(app, "GET", "/rag/documents")).body.data).toHaveLength(1);
	});

	test("requires a token and a valid id", async () => {
		const { app } = buildTestApp();
		expect((await app.request(`${base}/oversight/approvals`)).status).toBe(401);
		expect((await call(app, "POST", "/oversight/approvals/not-a-uuid/approve")).status).toBe(422);
	});
});

describe("answer feedback", () => {
	test("stores one rating per request and lets the user change it", async () => {
		const { app, feedback } = buildTestApp();
		const first = await call(app, "POST", "/oversight/feedback", "user-1", {
			requestId: "req_abc",
			rating: "down",
			comment: " missing the refund window ",
		});
		expect(first.status).toBe(200);
		expect(first.body.data).toMatchObject({ rating: "down", comment: "missing the refund window" });

		await call(app, "POST", "/oversight/feedback", "user-1", {
			requestId: "req_abc",
			rating: "up",
		});
		expect(feedback.rows).toEqual([
			expect.objectContaining({
				ownerId: "user-1",
				requestId: "req_abc",
				rating: "up",
				comment: null,
			}),
		]);
		const invalid = await call(app, "POST", "/oversight/feedback", "user-1", {
			requestId: "req_abc",
			rating: "meh",
		});
		expect(invalid.status).toBe(422);
	});
});
