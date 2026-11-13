import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import { EvaluationsContainer } from "@/features/evaluations";
import { setAccessToken } from "@/lib/api/session";

import { type Call, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const documents = [
	{
		id: "d1",
		title: "Refund policy",
		source: null,
		chunkCount: 1,
		createdAt: "2026-11-13T08:00:00Z",
	},
	{ id: "d2", title: "Shipping", source: null, chunkCount: 1, createdAt: "2026-11-13T08:00:00Z" },
];

const metrics = (recallAtK: number, mrr: number) => ({ recallAtK, mrr });
const run = {
	id: "r1",
	k: 5,
	questionCount: 1,
	embeddingModel: "openai/text-embedding-3-small",
	chunkerVersion: "text-v1",
	modes: { hybrid: metrics(1, 1), vector: metrics(1, 0.5), keyword: metrics(0, 0) },
	createdAt: "2026-11-13T09:00:00Z",
	cases: [
		{
			questionId: "q1",
			question: "How long do refunds take?",
			expectedDocumentIds: ["d1"],
			ranks: { hybrid: 1, vector: 2, keyword: null },
		},
	],
};

/** A small fake API: documents, questions (added in memory) and runs. */
function fakeApi() {
	const questions: {
		id: string;
		question: string;
		expectedDocumentIds: string[];
		createdAt: string;
	}[] = [];
	const runs: (typeof run)[] = [];
	const calls = mockFetch((call: Call) => {
		const path = new URL(call.url).pathname.replace("/api/v1", "");
		if (path === "/rag/documents") return ok(documents);
		if (path === "/evaluations/questions" && call.method === "POST") {
			const body = call.body as { question: string; expectedDocumentIds: string[] };
			const created = {
				id: `q${questions.length + 1}`,
				...body,
				createdAt: "2026-11-13T08:30:00Z",
			};
			questions.push(created);
			return ok(created, 201);
		}
		if (path === "/evaluations/questions") return ok(questions);
		if (path === "/evaluations/runs" && call.method === "POST") {
			runs.unshift(run);
			return ok(run, 201);
		}
		if (path === "/evaluations/runs") {
			return ok(runs.map(({ cases: _cases, ...summary }) => summary));
		}
		if (path === "/evaluations/runs/r1") return ok(run);
		throw new Error(`unexpected ${call.method} ${path}`);
	});
	return { calls, questions };
}

describe("EvaluationsContainer (mocked API)", () => {
	test("a question needs a document; then it is posted with the chosen one", async () => {
		signedIn();
		const { calls } = fakeApi();
		renderWithQuery(<EvaluationsContainer />);
		await screen.findByText(/No questions yet/);
		expect(
			(screen.getByRole("button", { name: "Run evaluation" }) as HTMLButtonElement).disabled,
		).toBe(true);

		fireEvent.change(screen.getByLabelText("Question"), {
			target: { value: "How long do refunds take?" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add question" }));
		await screen.findByText("Pick at least one document that answers it");

		// The label (as a user would click it); happy-dom does not toggle Base UI's span on click.
		fireEvent.click(await screen.findByText("Refund policy"));
		await waitFor(() =>
			expect(
				screen.getByRole("checkbox", { name: "Refund policy" }).getAttribute("aria-checked"),
			).toBe("true"),
		);
		fireEvent.click(screen.getByRole("button", { name: "Add question" }));

		const row = (await screen.findByRole("cell", { name: "How long do refunds take?" })).closest(
			"tr",
		);
		expect(within(row as HTMLElement).getByText("Refund policy")).toBeDefined();
		const post = calls.find((call) => call.method === "POST");
		expect(post?.body).toEqual({
			question: "How long do refunds take?",
			expectedDocumentIds: ["d1"],
		});
	});

	test("a run shows each mode's score and where each question's document ranked", async () => {
		signedIn();
		const { questions, calls } = fakeApi();
		questions.push({ ...run.cases[0], id: "q1", createdAt: "2026-11-13T08:30:00Z" } as never);
		renderWithQuery(<EvaluationsContainer />);
		await screen.findByText("No runs yet.");

		fireEvent.click(screen.getByRole("button", { name: "Top 3" }));
		const runButton = screen.getByRole("button", { name: "Run evaluation" });
		await waitFor(() => expect((runButton as HTMLButtonElement).disabled).toBe(false));
		fireEvent.click(runButton);

		const scores = await screen.findByRole("table", { name: "Score per search mode" });
		const hybrid = within(scores).getByRole("row", { name: /Hybrid/ });
		expect(hybrid.textContent).toContain("100%");
		expect(within(scores).getByRole("row", { name: /Meaning/ }).textContent).toContain("0.50");
		const ranks = screen.getByRole("table", {
			name: "Rank of the first expected document for each question",
		});
		expect(within(ranks).getByText("#1")).toBeDefined();
		expect(within(ranks).getByText("Not found")).toBeDefined();
		expect(
			calls.find((call) => call.url.endsWith("/evaluations/runs") && call.method === "POST")?.body,
		).toEqual({ k: 3 });
	});
});
