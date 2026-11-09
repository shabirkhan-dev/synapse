import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

import { DocumentsContainer } from "@/features/documents";
import { setAccessToken } from "@/lib/api/session";

import { failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
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

describe("DocumentsContainer (mocked API)", () => {
	test("loading, then the empty state", async () => {
		signedIn();
		mockFetch(() => ok([]));
		renderWithQuery(<DocumentsContainer />);
		expect(screen.getByRole("status").textContent).toContain("Loading documents");
		await screen.findByText(/No documents yet/);
	});

	test("adding a document posts it and refreshes the list", async () => {
		signedIn();
		const stored: ReturnType<typeof doc>[] = [];
		const calls = mockFetch((call) => {
			if (call.method === "POST") {
				const created = doc("d1", (call.body as { title: string }).title);
				stored.unshift(created);
				return ok(created, 201);
			}
			return ok(stored);
		});
		renderWithQuery(<DocumentsContainer />);
		await screen.findByText(/No documents yet/);

		fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Refund policy" } });
		fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Within 30 days." } });
		fireEvent.click(screen.getByRole("button", { name: "Add document" }));

		await screen.findByRole("cell", { name: "Refund policy" });
		expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
		expect(calls.filter((call) => call.method === "GET")).toHaveLength(2);
	});

	test("a failed load shows the API's message and can be retried", async () => {
		signedIn();
		let fail = true;
		mockFetch(() =>
			fail
				? failure(500, "INTERNAL_SERVER_ERROR", "Internal server error")
				: ok([doc("d1", "Back")]),
		);
		renderWithQuery(<DocumentsContainer />);
		await screen.findByText("Documents could not be loaded");
		expect(screen.getByText(/Internal server error/)).toBeDefined();

		fail = false;
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await waitFor(() => expect(screen.getByRole("cell", { name: "Back" })).toBeDefined());
	});

	test("an ingest error is shown without losing the typed text", async () => {
		signedIn();
		mockFetch((call) =>
			call.method === "POST" ? failure(413, "PAYLOAD_TOO_LARGE", "Document too large") : ok([]),
		);
		renderWithQuery(<DocumentsContainer />);
		await screen.findByText(/No documents yet/);
		fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Huge" } });
		fireEvent.change(screen.getByLabelText("Text"), { target: { value: "x" } });
		fireEvent.click(screen.getByRole("button", { name: "Add document" }));
		await screen.findByText("Document too large");
		expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Huge");
	});
});
