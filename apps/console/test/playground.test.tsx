import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PlaygroundContainer } from "@/features/playground";
import { AnswerText } from "@/features/playground/components/answer-text";
import { MatchesList } from "@/features/playground/components/matches-list";
import { SourceLink } from "@/features/playground/components/source-link";
import { setAccessToken } from "@/lib/api/session";

import { failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

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
		expect(screen.getByText("vector 1")).toBeDefined();
		expect(screen.getByText("keyword 2")).toBeDefined();
		expect(screen.getByText("rerank 1")).toBeDefined();
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
		const calls = mockFetch((call) =>
			call.url.endsWith("/oversight/feedback")
				? ok({ ...(call.body as object), comment: null, createdAt: "2026-11-09T10:00:00Z" })
				: ok(answered),
		);
		renderWithQuery(<PlaygroundContainer />);
		await ask("How long for refunds?");

		await screen.findByText(/Refunds are accepted within 30 days/);
		const query = calls[0];
		expect(query?.body).toEqual({ query: "How long for refunds?", topK: 3 });
		const requestId = query?.headers.get("x-request-id") ?? "";
		expect(requestId).toMatch(/^console_[0-9a-f-]{36}$/);
		expect(screen.getAllByRole("link", { name: /^Source / })).toHaveLength(2);
		expect(document.getElementById("citation-2")?.textContent).toContain("Shipping");
		expect(screen.getByText("cohere:rerank-v3.5")).toBeDefined();
		expect(screen.getByText(requestId)).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: "No" }));
		await screen.findByText("Thanks, noted.");
		expect(calls[1]?.body).toEqual({ requestId, rating: "down" });
		expect(screen.getByRole("button", { name: "No" }).getAttribute("aria-pressed")).toBe("true");

		// A new question starts unrated.
		await ask("And shipping?");
		await waitFor(() => expect(calls).toHaveLength(3));
		await screen.findByText(/Refunds are accepted/);
		expect(screen.queryByText("Thanks, noted.")).toBeNull();
		expect(calls[2]?.headers.get("x-request-id")).not.toBe(requestId);
	});

	test("with no documents: the API's message, no feedback, a link to add documents", async () => {
		signedIn();
		mockFetch(() =>
			ok({
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
		mockFetch(() =>
			failure(
				503,
				"RELIABILITY_CIRCUIT_OPEN",
				"A provider is unavailable right now; try again shortly",
			),
		);
		renderWithQuery(<PlaygroundContainer />);
		await ask("Hello?");
		await screen.findByText("A provider is unavailable right now; try again shortly");
	});

	test("validates the question and the passage count before calling the API", async () => {
		signedIn();
		const calls = mockFetch(() => ok(answered));
		renderWithQuery(<PlaygroundContainer />);
		await ask("   ", "99");
		expect(screen.getByText("Ask a question")).toBeDefined();
		expect(screen.getByText("At most 20")).toBeDefined();
		expect(calls).toHaveLength(0);
	});
});
