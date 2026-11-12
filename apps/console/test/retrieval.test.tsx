import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { RetrievalContainer } from "@/features/retrieval";
import { ModeResults } from "@/features/retrieval/components/mode-results";
import type { ModeResult } from "@/features/retrieval/types/retrieval.types";
import { crossRanks } from "@/features/retrieval/utils/cross-ranks";
import { setAccessToken } from "@/lib/api/session";

import { failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const match = (chunkId: string, score: number, ranks: Record<string, number> = {}) => ({
	chunkId,
	documentId: `doc-${chunkId}`,
	documentTitle: `Doc ${chunkId}`,
	chunkIndex: 0,
	content: `Text of ${chunkId}`,
	score,
	ranks,
});

const RESULTS: ModeResult[] = [
	{
		mode: "hybrid",
		status: "ok",
		matches: [match("a", 0.0325, { vector: 2, keyword: 1 }), match("b", 0.016, { vector: 1 })],
	},
	{
		mode: "vector",
		status: "ok",
		matches: [match("b", 0.91, { vector: 1 }), match("a", 0.85, { vector: 2 })],
	},
	{ mode: "keyword", status: "ok", matches: [match("a", 0.1, { keyword: 1 })] },
];

describe("crossRanks", () => {
	test("records each chunk's position in every mode that found it", () => {
		const ranks = crossRanks(RESULTS);
		expect(ranks.get("a")).toEqual({ hybrid: 1, vector: 2, keyword: 1 });
		expect(ranks.get("b")).toEqual({ hybrid: 2, vector: 1 });
	});
});

describe("ModeResults", () => {
	test("one column per mode, scores labelled per mode, and where else each passage ranked", () => {
		render(<ModeResults results={RESULTS} />);
		const hybrid = screen.getByRole("region", { name: "Hybrid" });
		expect(within(hybrid).getAllByText(/Fused \(RRF\) score/)).toHaveLength(2);
		expect(within(hybrid).getAllByRole("listitem")[0]?.textContent).toContain(
			"also #2 in Meaning, #1 in Keywords",
		);
		const meaning = screen.getByRole("region", { name: "Meaning" });
		expect(within(meaning).getAllByText(/Cosine similarity/)).toHaveLength(2);
		const keywords = screen.getByRole("region", { name: "Keywords" });
		expect(within(keywords).getByText(/Keyword score/)).toBeDefined();
		expect(within(hybrid).getAllByRole("link")[0]?.getAttribute("href")).toBe("/documents/doc-a");
		expect(screen.getByText(/compare ranks, not numbers/)).toBeDefined();
	});

	test("a failed mode says so in its own column; an empty one says nothing matched", () => {
		render(
			<ModeResults
				results={[
					{ mode: "hybrid", status: "ok", matches: [] },
					{ mode: "vector", status: "failed", message: "Embedding service unavailable" },
					{ mode: "keyword", status: "ok", matches: [match("k", 0.2)] },
				]}
			/>,
		);
		expect(
			within(screen.getByRole("region", { name: "Hybrid" })).getByText("No passages matched."),
		).toBeDefined();
		expect(screen.getByText("Meaning search failed")).toBeDefined();
		expect(screen.getByText("Embedding service unavailable")).toBeDefined();
		expect(screen.getByText(/only in Keywords/)).toBeDefined();
	});
});

describe("RetrievalContainer (mocked API)", () => {
	test("sends the query once per mode, retrieval only, and shows every column", async () => {
		signedIn();
		const calls = mockFetch((call) => {
			const { mode } = call.body as { mode: string };
			return mode === "vector"
				? failure(503, "RELIABILITY_CIRCUIT_OPEN", "The embedding service is unavailable")
				: ok({ answer: null, matches: [match(mode, 0.1)], citations: [], provenance: null });
		});
		renderWithQuery(<RetrievalContainer />);
		fireEvent.change(screen.getByLabelText("Search for"), { target: { value: "  refunds  " } });
		fireEvent.change(screen.getByLabelText("Passages per mode"), { target: { value: "3" } });
		fireEvent.click(screen.getByRole("button", { name: "Compare" }));

		await screen.findByRole("region", { name: "Keywords" });
		expect(screen.getByText("The embedding service is unavailable")).toBeDefined();
		expect(screen.getByText("Doc hybrid")).toBeDefined();
		expect(calls.map((call) => call.body)).toEqual([
			{ query: "refunds", topK: 3, answer: false, mode: "hybrid" },
			{ query: "refunds", topK: 3, answer: false, mode: "vector" },
			{ query: "refunds", topK: 3, answer: false, mode: "keyword" },
		]);
	});

	test("explains an empty query or a bad count instead of searching", () => {
		const calls = mockFetch(() => ok({ matches: [] }));
		renderWithQuery(<RetrievalContainer />);
		fireEvent.change(screen.getByLabelText("Passages per mode"), { target: { value: "0" } });
		fireEvent.click(screen.getByRole("button", { name: "Compare" }));
		expect(screen.getByText("Type what to search for")).toBeDefined();
		expect(screen.getByText("At least 1")).toBeDefined();
		expect(calls).toHaveLength(0);
	});
});
