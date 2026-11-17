import { describe, expect, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

import { authHeaders, buildTestApp, textGenerateResult } from "./helpers";

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
	answers: null | {
		judge: { provider: string; model: string; version: string };
		faithfulness: number | null;
		relevance: number | null;
		judged: number;
	};
	cases: Array<{
		question: string;
		ranks: Record<string, number | null>;
		answer: null | {
			text: string;
			faithfulness: number | null;
			relevance: number | null;
			reason: string | null;
		};
	}>;
};

type Prompt = Array<{ role: string; content: unknown }>;
const text = (prompt: Prompt) => JSON.stringify(prompt);

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

	test("with judgeAnswers, each question is answered and judged; an unreadable verdict leaves it unjudged", async () => {
		// The chat model answers RAG prompts and grades judge prompts, except the shipping question.
		const chatModel = new MockLanguageModelV4({
			doGenerate: async ({ prompt }) => {
				const sent = text(prompt as Prompt);
				if (!sent.includes("You grade answers")) return textGenerateResult("Within 30 days [1].");
				return textGenerateResult(
					sent.includes("When do orders ship?")
						? "I would rather not say."
						: '{"faithfulness": 0.8, "relevance": 0.6, "reason": "Mostly supported."}',
				);
			},
		});
		const { app, auditEvents } = buildTestApp({ chatModel });
		const refunds = await ingest(app, "Refunds", "Refunds are accepted within 30 days.");
		const shipping = await ingest(app, "Shipping", "Orders ship within two business days.");
		for (const [question, expected] of [
			["How many days do refunds take?", refunds],
			["When do orders ship?", shipping],
		] as const) {
			// oxlint-disable-next-line no-await-in-loop -- questions keep their order
			await call(app, "/evaluations/questions", {
				method: "POST",
				body: { question, expectedDocumentIds: [expected] },
			});
		}

		const run = await call<Run>(app, "/evaluations/runs", {
			method: "POST",
			body: { k: 2, judgeAnswers: true },
		});
		expect(run.status).toBe(201);
		expect(run.body.data.answers).toEqual({
			judge: { provider: expect.any(String), model: expect.any(String), version: "answer-judge@1" },
			faithfulness: 0.8,
			relevance: 0.6,
			judged: 1,
		});
		expect(run.body.data.cases.map((item) => item.answer)).toEqual([
			{
				text: "Within 30 days [1].",
				faithfulness: 0.8,
				relevance: 0.6,
				reason: "Mostly supported.",
			},
			{
				text: "Within 30 days [1].",
				faithfulness: null,
				relevance: null,
				reason: "Not judged: the judge's reply could not be read or the call failed",
			},
		]);
		// The judge read the passages the answer was written from, numbered.
		const judgeCalls = chatModel.doGenerateCalls.filter((item) =>
			text(item.prompt as Prompt).includes("You grade answers"),
		);
		expect(judgeCalls).toHaveLength(2);
		expect(text(judgeCalls[0]?.prompt as Prompt)).toContain("[1] ");

		// Kept with the run; each answer is audited like any other.
		const detail = await call<Run>(app, `/evaluations/runs/${run.body.data.id}`);
		expect(detail.body.data.answers?.judged).toBe(1);
		const summary = await call<Run[]>(app, "/evaluations/runs");
		expect(summary.body.data[0]?.answers?.faithfulness).toBe(0.8);
		expect(auditEvents.events.filter((item) => item.action === "rag.query.answered")).toHaveLength(
			2,
		);
		const completed = auditEvents.events.find((item) => item.action === "evaluation.run.completed");
		expect(completed?.data).toMatchObject({ answers: { judged: 1 } });
	});

	test("a run without judgeAnswers calls no chat model and has no answer scores", async () => {
		const chatModel = new MockLanguageModelV4({ doGenerate: textGenerateResult("unused") });
		const { app } = buildTestApp({ chatModel });
		const refunds = await ingest(app, "Refunds", "Refunds are accepted within 30 days.");
		await call(app, "/evaluations/questions", {
			method: "POST",
			body: { question: "How many days do refunds take?", expectedDocumentIds: [refunds] },
		});
		const run = await call<Run>(app, "/evaluations/runs", { method: "POST", body: { k: 1 } });
		expect(run.body.data.answers).toBeNull();
		expect(run.body.data.cases[0]?.answer).toBeNull();
		expect(chatModel.doGenerateCalls).toHaveLength(0);
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
