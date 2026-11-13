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

	test("uploading a file sends it as multipart and refreshes the list", async () => {
		signedIn();
		const stored: ReturnType<typeof doc>[] = [];
		const calls = mockFetch((call) => {
			if (call.method === "POST") {
				const form = call.body as FormData;
				const created = doc("d2", String(form.get("title")));
				stored.unshift(created);
				return ok(created, 201);
			}
			return ok(stored);
		});
		renderWithQuery(<DocumentsContainer />);
		await screen.findByText(/No documents yet/);

		const file = new File(["# Refunds\n\nWithin 30 days."], "refunds.md", {
			type: "text/markdown",
		});
		fireEvent.change(screen.getByLabelText(/Choose a file/), { target: { files: [file] } });
		expect(screen.getByText("refunds.md")).toBeDefined();
		fireEvent.change(screen.getByLabelText("Title (optional)"), {
			target: { value: "Refund policy" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Upload file" }));

		await screen.findByRole("cell", { name: "Refund policy" });
		const post = calls.find((call) => call.method === "POST");
		if (!post) throw new Error("no upload was sent");
		expect(post.url).toEndWith("/rag/documents/upload");
		// The browser sets the multipart boundary, so the client must not set a content type.
		expect(post.headers.get("content-type")).toBeNull();
		expect(((post.body as FormData).get("file") as File).name).toBe("refunds.md");
		expect(screen.getByText("Choose a file or drop it here")).toBeDefined();
	});

	test("a wrong type or a file over 2 MB is refused before anything is sent", async () => {
		signedIn();
		const calls = mockFetch(() => ok([]));
		renderWithQuery(<DocumentsContainer />);
		await screen.findByText(/No documents yet/);
		const picker = screen.getByLabelText(/Choose a file/);

		fireEvent.change(picker, { target: { files: [new File(["x"], "slides.pptx")] } });
		fireEvent.click(screen.getByRole("button", { name: "Upload file" }));
		await screen.findByText("Upload a .txt, .md or .pdf file");
		expect(picker.getAttribute("aria-invalid")).toBe("true");

		const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.pdf");
		fireEvent.change(screen.getByLabelText(/slides\.pptx|Choose a file/), {
			target: { files: [big] },
		});
		fireEvent.click(screen.getByRole("button", { name: "Upload file" }));
		await screen.findByText("Files must be 2 MB or smaller");
		expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
	});

	test("the API's reason is shown and the file stays chosen", async () => {
		signedIn();
		mockFetch((call) =>
			call.method === "POST"
				? failure(422, "RAG_FILE_HAS_NO_TEXT", "This file has no text to search.")
				: ok([]),
		);
		renderWithQuery(<DocumentsContainer />);
		await screen.findByText(/No documents yet/);
		const scan = new File(["%PDF-1.4"], "scan.pdf", { type: "application/pdf" });
		fireEvent.change(screen.getByLabelText(/Choose a file/), { target: { files: [scan] } });
		fireEvent.click(screen.getByRole("button", { name: "Upload file" }));
		await screen.findByText("This file has no text to search.");
		expect(screen.getByText("scan.pdf")).toBeDefined();

		// Choosing another file clears the old reason.
		const notes = new File(["notes"], "notes.txt", { type: "text/plain" });
		fireEvent.change(screen.getByLabelText(/scan\.pdf/), { target: { files: [notes] } });
		expect(screen.getByText("notes.txt")).toBeDefined();
		// A boolean, not the node: printing a DOM node on every retry is very slow under Bun.
		await waitFor(() =>
			expect(screen.queryByText("This file has no text to search.") === null).toBe(true),
		);
	});
});
