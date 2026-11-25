import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { type Call, failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

// The page reads the address bar ("Ask about this document" arrives with `?d=<id>`).
let search = new URLSearchParams();
mock.module("next/navigation", () => ({
	useRouter: () => ({ replace: mock(), push: mock(), back: mock() }),
	usePathname: () => "/playground",
	useSearchParams: () => search,
}));

const { PlaygroundContainer } = await import("@/features/playground");
const { AnswerText } = await import("@/features/playground/components/answer-text");
const { MatchesList } = await import("@/features/playground/components/matches-list");
const { SourceLink } = await import("@/features/playground/components/source-link");
const { setAccessToken } = await import("@/lib/api/session");

afterEach(() => {
	cleanup();
	setAccessToken(null);
	search = new URLSearchParams();
});

const doc = (id: string, title: string) => ({
	id,
	title,
	source: null,
	metadata: {},
	chunkCount: 1,
	contentHash: "h",
	createdAt: "2026-11-09T10:00:00Z",
});
const DOCUMENTS = [
	doc("11111111-1111-4111-8111-111111111111", "Refunds"),
	doc("22222222-2222-4222-8222-222222222222", "Shipping"),
];

/** The page also loads the document list (for the scope picker); `handler` answers the rest. */
const withDocuments =
	(handler: (call: Call) => Response) =>
	(call: Call): Response =>
		call.method === "GET" && call.url.endsWith("/rag/documents") ? ok(DOCUMENTS) : handler(call);
const asked = (calls: Call[]) => calls.filter((call) => call.url.endsWith("/rag/query"));

const match = (chunkId: string, title: string, ranks = {}) => ({
	chunkId,
	documentId: `d-${chunkId}`,
	documentTitle: title,
	source: "https://example.com/refunds",
	chunkIndex: 0,
	content: `${title} text`,
	score: 0.0328,
	ranks,
});

const answered = {
	answer: "Refunds are accepted within 30 days [1]. Shipping is not refunded [2]. See [9].",
	matches: [
		match("c1", "Refunds", { vector: 1, keyword: 2 }),
		match("c2", "Shipping", { rerank: 1 }),
	],
	citations: [
		{
			index: 1,
			chunkId: "c1",
			documentId: "d-c1",
			title: "Refunds",
			source: "https://example.com/refunds",
		},
		{ index: 2, chunkId: "c2", documentId: "d-c2", title: "Shipping", source: null },
	],
	provenance: {
		chatModel: "openrouter:openai/gpt-4o-mini",
		promptVersion: "rag-answer@2",
		embeddingModel: "openrouter:openai/text-embedding-3-small",
		chunkerVersion: "text-v1;size=1000;overlap=150",
		reranker: "cohere:rerank-v3.5",
		usage: { inputTokens: 120, outputTokens: 20 },
	},
};

describe("AnswerText", () => {
	test("known [n] markers link to their source; unknown ones stay text; HTML is never rendered", () => {
		render(
			<AnswerText text={'Yes [1]. <img src=x onerror="alert(1)"> [7]'} citations={new Set([1])} />,
		);
		expect(screen.getByRole("link", { name: "Source 1" }).getAttribute("href")).toBe("#citation-1");
		expect(screen.queryByRole("link", { name: "Source 7" })).toBeNull();
		expect(document.querySelector("img")).toBeNull();
		expect(screen.getByText(/onerror/)).toBeDefined();
	});
});

describe("SourceLink", () => {
	test("links only http(s) sources", () => {
		const { rerender } = render(<SourceLink source="https://example.com/a" />);
		expect(screen.getByRole("link").getAttribute("rel")).toContain("noopener");
		rerender(<SourceLink source="javascript:alert(1)" />);
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.getByText("javascript:alert(1)")).toBeDefined();
	});
});

describe("MatchesList", () => {
	test("shows each search's rank and the score", () => {
		render(<MatchesList matches={answered.matches} />);
		expect(screen.getByText("Meaning #1")).toBeDefined();
		expect(screen.getByText("Keywords #2")).toBeDefined();
		expect(screen.getByText("Reranker #1")).toBeDefined();
		expect(screen.getAllByText("score 0.0328")).toHaveLength(2);
	});
});

async function ask(question: string, topK = "3") {
	fireEvent.change(screen.getByLabelText("Question"), { target: { value: question } });
	fireEvent.change(screen.getByLabelText("Passages"), { target: { value: topK } });
	fireEvent.click(screen.getByRole("button", { name: "Ask" }));
}

describe("PlaygroundContainer (mocked API)", () => {
	test("asks with its own request id, shows the cited answer and provenance, and rates that answer", async () => {
		signedIn();
		const calls = mockFetch(
			withDocuments((call) =>
				call.url.endsWith("/oversight/feedback")
					? ok({ ...(call.body as object), comment: null, createdAt: "2026-11-09T10:00:00Z" })
					: ok(answered),
			),
		);
		renderWithQuery(<PlaygroundContainer />);
		await ask("How long for refunds?");

		await screen.findByText(/Refunds are accepted within 30 days/);
		const query = asked(calls)[0];
		expect(query?.body).toEqual({ query: "How long for refunds?", topK: 3 });
		expect(screen.queryByText(/chosen document/)).toBeNull();
		const requestId = query?.headers.get("x-request-id") ?? "";
		expect(requestId).toMatch(/^console_[0-9a-f-]{36}$/);
		expect(screen.getAllByRole("link", { name: /^Source / })).toHaveLength(2);
		expect(document.getElementById("citation-2")?.textContent).toContain("Shipping");
		expect(screen.getByText("cohere:rerank-v3.5")).toBeDefined();
		expect(screen.getByText(requestId)).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: "No" }));
		await screen.findByText("Thanks, noted.");
		const rated = calls.find((call) => call.url.endsWith("/oversight/feedback"));
		expect(rated?.body).toEqual({ requestId, rating: "down" });
		expect(screen.getByRole("button", { name: "No" }).getAttribute("aria-pressed")).toBe("true");

		// A new question starts unrated.
		await ask("And shipping?");
		await waitFor(() => expect(asked(calls)).toHaveLength(2));
		await screen.findByText(/Refunds are accepted/);
		expect(screen.queryByText("Thanks, noted.")).toBeNull();
		expect(asked(calls)[1]?.headers.get("x-request-id")).not.toBe(requestId);
	});

	test("with no documents: the API's message, no feedback, a link to add documents", async () => {
		signedIn();
		mockFetch((call) =>
			call.url.endsWith("/rag/documents")
				? ok([])
				: ok({
						answer: "I could not find any ingested documents to answer from.",
						matches: [],
						citations: [],
						provenance: null,
					}),
		);
		renderWithQuery(<PlaygroundContainer />);
		await ask("Anything?");
		await screen.findByText("I could not find any ingested documents to answer from.");
		expect(screen.queryByText("Was this useful?")).toBeNull();
		expect(screen.getByRole("link", { name: "Add a document" }).getAttribute("href")).toBe(
			"/documents",
		);
		expect(screen.getByText("No passages matched.")).toBeDefined();
	});

	test("a provider outage shows the API's message", async () => {
		signedIn();
		mockFetch(
			withDocuments(() =>
				failure(
					503,
					"RELIABILITY_CIRCUIT_OPEN",
					"A provider is unavailable right now; try again shortly",
				),
			),
		);
		renderWithQuery(<PlaygroundContainer />);
		await ask("Hello?");
		await screen.findByText("A provider is unavailable right now; try again shortly");
	});

	test("validates the question and the passage count before calling the API", async () => {
		signedIn();
		const calls = mockFetch(withDocuments(() => ok(answered)));
		renderWithQuery(<PlaygroundContainer />);
		await ask("   ", "99");
		expect(screen.getByText("Ask a question")).toBeDefined();
		expect(screen.getByText("At most 20")).toBeDefined();
		expect(asked(calls)).toHaveLength(0);
	});

	test("a question can be narrowed to chosen documents, and cleared back to all", async () => {
		signedIn();
		const calls = mockFetch(withDocuments(() => ok(answered)));
		renderWithQuery(<PlaygroundContainer />);
		expect(screen.getByText("All documents")).toBeDefined();

		// The label, as a user clicks it (happy-dom does not toggle Base UI's span on click).
		const option = (title: string) => screen.findByText(title, { selector: "li span" });
		fireEvent.click(await option("Shipping"));
		await screen.findByText("Shipping", { selector: "span.truncate" });
		fireEvent.click(await option("Refunds"));
		await screen.findByText("2 documents");
		await ask("What is covered?");
		await screen.findByText("Searched 2 chosen documents only.");
		expect(asked(calls)[0]?.body).toEqual({
			query: "What is covered?",
			topK: 3,
			documentIds: [DOCUMENTS[1]?.id, DOCUMENTS[0]?.id],
		});

		fireEvent.click(screen.getByRole("button", { name: "Search all documents" }));
		expect(screen.getByText("All documents")).toBeDefined();
		await ask("And now?");
		await waitFor(() => expect(asked(calls)).toHaveLength(2));
		expect(asked(calls)[1]?.body).toEqual({ query: "And now?", topK: 3 });
	});

	test("arriving from a document's page searches only that document", async () => {
		signedIn();
		search = new URLSearchParams({ d: DOCUMENTS[0]?.id ?? "" });
		const calls = mockFetch(withDocuments(() => ok(answered)));
		renderWithQuery(<PlaygroundContainer />);
		// The title shows once the list has loaded.
		await screen.findByText("Refunds", { selector: "span.truncate" });
		await ask("How long?");
		await screen.findByText("Searched 1 chosen document only.");
		expect(asked(calls)[0]?.body).toEqual({
			query: "How long?",
			topK: 3,
			documentIds: [DOCUMENTS[0]?.id],
		});
	});

	test("an answer can be copied, asked again, and followed up with the same passages and scope", async () => {
		const writeText = mock(async () => {});
		Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
		signedIn();
		const calls = mockFetch(
			withDocuments((call) =>
				call.url.endsWith("/rag/follow-ups")
					? ok({
							questions: ["Is shipping refunded?", "What about sale items?"],
							chatModel: "fake:m",
							promptVersion: "follow-ups@1",
						})
					: ok(answered),
			),
		);
		renderWithQuery(<PlaygroundContainer />);
		fireEvent.click(await screen.findByText("Shipping", { selector: "li span" }));
		await ask("How long for refunds?", "4");
		await screen.findByText(/Refunds are accepted within 30 days/);

		fireEvent.click(screen.getByRole("button", { name: "Copy answer" }));
		await waitFor(() => expect(writeText).toHaveBeenCalledWith(answered.answer));

		fireEvent.click(await screen.findByRole("button", { name: /What about sale items\?/ }));
		await waitFor(() => expect(asked(calls)).toHaveLength(2));
		expect(asked(calls)[1]?.body).toEqual({
			query: "What about sale items?",
			topK: 4,
			documentIds: [DOCUMENTS[1]?.id],
		});
		expect(calls.find((call) => call.url.endsWith("/rag/follow-ups"))?.body).toEqual({
			question: "How long for refunds?",
			answer: answered.answer,
		});

		await screen.findByText(/Refunds are accepted within 30 days/);
		fireEvent.click(screen.getByRole("button", { name: "Ask again" }));
		await waitFor(() => expect(asked(calls)).toHaveLength(3));
		expect(asked(calls)[2]?.body).toEqual(asked(calls)[1]?.body);
	});
});
