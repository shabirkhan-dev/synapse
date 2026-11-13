import { describe, expect, test } from "bun:test";

import { authHeaders, buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
type Envelope<T> = { data: T; error?: { code: string; details?: unknown } };

async function call<T>(
	app: App,
	path: string,
	init: { method?: string; body?: unknown; user?: string } = {},
) {
	const response = await app.request(`/api/v1${path}`, {
		method: init.method ?? "GET",
		headers: await authHeaders(init.user),
		...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
	});
	return { status: response.status, body: (await response.json()) as Envelope<T> };
}

async function ingest(app: App, title: string, content: string): Promise<string> {
	const reply = await call<{ id: string }>(app, "/rag/documents", {
		method: "POST",
		body: { title, content },
	});
	return reply.body.data.id;
}

type Run = {
	id: string;
	k: number;
	questionCount: number;
	embeddingModel: string;
	modes: Record<"hybrid" | "vector" | "keyword", { recallAtK: number; mrr: number }>;
	cases: Array<{ question: string; ranks: Record<string, number | null> }>;
};

describe("evaluations", () => {
	test("a question needs documents that exist in the workspace", async () => {
		const { app } = buildTestApp();
		const missing = await call(app, "/evaluations/questions", {
			method: "POST",
			body: { question: "Refunds?", expectedDocumentIds: [crypto.randomUUID()] },
		});
		expect(missing.status).toBe(422);
		expect(missing.body.error?.code).toBe("EVAL_UNKNOWN_DOCUMENTS");

		// Another organization's document is unknown here too.
		const theirs = await ingest(app, "Their policy", "Refunds within 30 days.");
		const crossTenant = await call(app, "/evaluations/questions", {
			method: "POST",
			user: "user-2",
			body: { question: "Refunds?", expectedDocumentIds: [theirs] },
		});
		expect(crossTenant.body.error?.code).toBe("EVAL_UNKNOWN_DOCUMENTS");
	});

	test("a run scores every mode, stores the ranks and the versions, and is audited", async () => {
		const { app, auditEvents } = buildTestApp();
		const refunds = await ingest(
			app,
			"Refunds",
			"Refunds are accepted within 30 days of purchase.",
		);
		const shipping = await ingest(app, "Shipping", "Orders ship within two business days by post.");
		for (const [question, expected] of [
			["How many days do refunds take?", refunds],
			["When do orders ship by post?", shipping],
		] as const) {
			// oxlint-disable-next-line no-await-in-loop -- questions keep their order
			const added = await call(app, "/evaluations/questions", {
				method: "POST",
				body: { question, expectedDocumentIds: [expected, expected] },
			});
			expect(added.status).toBe(201);
		}
		const questions = await call<{ expectedDocumentIds: string[] }[]>(
			app,
			"/evaluations/questions",
		);
		expect(questions.body.data.map((item) => item.expectedDocumentIds)).toEqual([
			[refunds],
			[shipping],
		]);

		const run = await call<Run>(app, "/evaluations/runs", { method: "POST", body: { k: 1 } });
		expect(run.status).toBe(201);
		expect(run.body.data).toMatchObject({ k: 1, questionCount: 2 });
		expect(run.body.data.modes.keyword).toEqual({ recallAtK: 1, mrr: 1 });
		expect(run.body.data.modes.hybrid.recallAtK).toBe(1);
		expect(run.body.data.cases.map((item) => item.ranks.keyword)).toEqual([1, 1]);

		const runs = await call<Run[]>(app, "/evaluations/runs");
		expect(runs.body.data).toHaveLength(1);
		expect(runs.body.data[0]).not.toHaveProperty("cases");
		const detail = await call<Run>(app, `/evaluations/runs/${run.body.data.id}`);
		expect(detail.body.data.cases).toHaveLength(2);

		const event = auditEvents.events.find((item) => item.action === "evaluation.run.completed");
		expect(event?.subjectId).toBe(run.body.data.id);
	});

	test("questions and runs belong to the active organization", async () => {
		const { app } = buildTestApp();
		const doc = await ingest(app, "Refunds", "Refunds within 30 days.");
		const added = await call<{ id: string }>(app, "/evaluations/questions", {
			method: "POST",
			body: { question: "Refunds?", expectedDocumentIds: [doc] },
		});
		const run = await call<Run>(app, "/evaluations/runs", { method: "POST", body: {} });
		expect(run.body.data.k).toBe(5);

		const other = { user: "user-2" };
		expect((await call<unknown[]>(app, "/evaluations/questions", other)).body.data).toEqual([]);
		expect((await call<unknown[]>(app, "/evaluations/runs", other)).body.data).toEqual([]);
		expect((await call(app, `/evaluations/runs/${run.body.data.id}`, other)).status).toBe(404);
		const deleteTheirs = await call(app, `/evaluations/questions/${added.body.data.id}`, {
			method: "DELETE",
			...other,
		});
		expect(deleteTheirs.status).toBe(404);
		expect(
			(await call(app, `/evaluations/questions/${added.body.data.id}`, { method: "DELETE" }))
				.status,
		).toBe(200);
	});

	test("a run needs questions; k and the question count are bounded", async () => {
		const { app, evaluationStore } = buildTestApp();
		const empty = await call(app, "/evaluations/runs", { method: "POST", body: {} });
		expect(empty.status).toBe(422);
		expect(empty.body.error?.code).toBe("EVAL_NO_QUESTIONS");
		expect((await call(app, "/evaluations/runs", { method: "POST", body: { k: 21 } })).status).toBe(
			422,
		);

		const doc = await ingest(app, "Refunds", "Refunds within 30 days.");
		for (let index = 0; index < 50; index++) {
			// oxlint-disable-next-line no-await-in-loop -- filling the store directly
			await evaluationStore.addQuestion({
				ownerId: "user-1",
				createdBy: "user-1",
				question: `Question ${index}`,
				expectedDocumentIds: [doc],
			});
		}
		const full = await call(app, "/evaluations/questions", {
			method: "POST",
			body: { question: "One more", expectedDocumentIds: [doc] },
		});
		expect(full.status).toBe(409);
		expect(full.body.error?.code).toBe("EVAL_TOO_MANY_QUESTIONS");
	});
});
