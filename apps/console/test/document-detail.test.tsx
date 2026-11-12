import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const replace = mock();
// The container sends you back to the list after deleting; no Next router runs under happy-dom.
mock.module("next/navigation", () => ({
	useRouter: () => ({ replace, push: mock(), back: mock() }),
	usePathname: () => "/documents",
	useSearchParams: () => new URLSearchParams(),
}));

const { DocumentContainer } = await import("@/features/documents");
const { ChunkList } = await import("@/features/documents/components/chunk-list");
const { setAccessToken } = await import("@/lib/api/session");
const { failure, mockFetch, ok, renderWithQuery, signedIn } = await import("./helpers");

afterEach(() => {
	cleanup();
	setAccessToken(null);
	replace.mockClear();
});

const CURRENT = {
	chunkerVersion: "text-v1;size=1000",
	embeddingModel: "openai:text-embedding-3-small",
};
const chunk = (index: number, overrides: Record<string, unknown> = {}) => ({
	id: `c${index}`,
	chunkIndex: index,
	content: `Passage ${index + 1}`,
	chunkerVersion: CURRENT.chunkerVersion,
	embeddingModel: CURRENT.embeddingModel,
	...overrides,
});
const detail = (total: number, offset: number, count: number) => ({
	id: "d1",
	title: "Refund policy",
	source: "https://example.com/refunds",
	chunkCount: total,
	createdAt: "2026-11-12T10:00:00Z",
	chunks: Array.from({ length: count }, (_, i) => chunk(offset + i)),
	page: { offset, limit: 50, total },
	current: CURRENT,
});

describe("ChunkList", () => {
	test("says in words which chunks are out of date and why; current ones carry no note", () => {
		render(
			<ChunkList
				current={CURRENT}
				chunks={[
					chunk(0),
					chunk(1, { embeddingModel: "openai:ada-002" }),
					chunk(2, { embeddingModel: null, chunkerVersion: null }),
					chunk(3, { chunkerVersion: "text-v0" }),
				]}
			/>,
		);
		const items = screen.getAllByRole("listitem");
		expect(items[0]?.textContent).not.toContain("Out of date");
		expect(items[1]?.textContent).toContain("search by meaning skips it until it is re-embedded");
		expect(items[2]?.textContent).toContain("Stored before versions were recorded");
		expect(items[3]?.textContent).toContain("Split by an older chunker (text-v0)");
		expect(screen.getAllByText("Out of date")).toHaveLength(3);
		expect(screen.getByText("Chunk 1")).toBeDefined();
	});
});

describe("DocumentContainer (mocked API)", () => {
	test("shows the document and pages through its chunks", async () => {
		signedIn();
		const calls = mockFetch((call) =>
			call.url.includes("offset=50") ? ok(detail(60, 50, 10)) : ok(detail(60, 0, 50)),
		);
		renderWithQuery(<DocumentContainer id="d1" />);
		await screen.findByRole("heading", { level: 1, name: "Refund policy" });
		expect(screen.getByRole("link", { name: "https://example.com/refunds" })).toBeDefined();
		expect(screen.getByText("Chunks 1–50 of 60")).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		await screen.findByText("Chunks 51–60 of 60");
		expect(screen.getByText("Passage 51")).toBeDefined();
		expect(calls.some((call) => call.url.endsWith("/rag/documents/d1?offset=50&limit=50"))).toBe(
			true,
		);
	});

	test("deletes after confirming and goes back to the list", async () => {
		signedIn();
		const calls = mockFetch((call) =>
			call.method === "DELETE" ? ok({ id: "d1" }) : ok(detail(3, 0, 3)),
		);
		renderWithQuery(<DocumentContainer id="d1" />);
		fireEvent.click(await screen.findByRole("button", { name: "Delete document…" }));
		expect(await screen.findByText("Delete “Refund policy”?")).toBeDefined();
		expect(screen.getByText(/Its 3 chunks are deleted too/)).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "Delete document" }));
		await waitFor(() => expect(replace).toHaveBeenCalledWith("/documents"));
		expect(
			calls.some((call) => call.method === "DELETE" && call.url.endsWith("/rag/documents/d1")),
		).toBe(true);
	});

	test("a document from another organization reads as missing, with a way back", async () => {
		signedIn();
		mockFetch(() => failure(404, "RAG_DOCUMENT_NOT_FOUND", "Document not found"));
		renderWithQuery(<DocumentContainer id="d1" />);
		await screen.findByText("This document does not exist");
		expect(screen.getByRole("link", { name: "Documents" }).getAttribute("href")).toBe("/documents");
	});
});
