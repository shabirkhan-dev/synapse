import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SubmitButton } from "@/components/shared/submit-button";
import { DocumentsTable } from "@/features/documents/components/documents-table";
import { IngestDocumentForm } from "@/features/documents/components/ingest-document-form";
import { SignInForm } from "@/features/auth/components/sign-in-form";

afterEach(cleanup);

const typeInto = (label: string, value: string) =>
	fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("SignInForm", () => {
	test("validates before submitting, then submits the parsed input", () => {
		const onSubmit = mock();
		render(<SignInForm onSubmit={onSubmit} pending={false} error={null} />);

		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
		expect(screen.getByText("Enter a valid email address")).toBeDefined();
		expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
		expect(onSubmit).not.toHaveBeenCalled();

		typeInto("Email", " ada@example.com ");
		typeInto("Password", "secret");
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
		expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.com", password: "secret" });
		expect(screen.queryByText("Enter a valid email address")).toBeNull();
	});

	test("shows the API's message and a pending button", () => {
		render(<SignInForm onSubmit={() => {}} pending error="Email or password is incorrect" />);
		expect(screen.getByText("Email or password is incorrect")).toBeDefined();
		expect(screen.getByRole("button", { name: "Signing in…" }).hasAttribute("disabled")).toBe(true);
	});
});

describe("IngestDocumentForm", () => {
	test("requires a title and text; an empty source is left out", async () => {
		const onSubmit = mock(async () => ({}));
		render(<IngestDocumentForm onSubmit={onSubmit} pending={false} error={null} />);

		fireEvent.click(screen.getByRole("button", { name: "Add document" }));
		expect(screen.getByText("Give the document a title")).toBeDefined();
		expect(screen.getByText("Paste the document's text")).toBeDefined();
		expect(onSubmit).not.toHaveBeenCalled();

		typeInto("Title", "Refund policy");
		typeInto("Text", "Refunds within 30 days.");
		fireEvent.click(screen.getByRole("button", { name: "Add document" }));
		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				title: "Refund policy",
				content: "Refunds within 30 days.",
				source: undefined,
			}),
		);
		await waitFor(() =>
			expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(""),
		);
	});

	test("keeps the text when the API rejects it", async () => {
		const onSubmit = mock(async () => {
			throw new Error("rejected");
		});
		render(<IngestDocumentForm onSubmit={onSubmit} pending={false} error="Document too large" />);
		typeInto("Title", "Big");
		typeInto("Text", "x");
		fireEvent.click(screen.getByRole("button", { name: "Add document" }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalled());
		expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Big");
		expect(screen.getByText("Document too large")).toBeDefined();
	});
});

describe("DocumentsTable", () => {
	test("one row per document, with a dash for a missing source", () => {
		render(
			<DocumentsTable
				documents={[
					{
						id: "1",
						title: "Refunds",
						source: "https://a.test",
						chunkCount: 3,
						createdAt: "2026-11-09T10:00:00Z",
					},
					{
						id: "2",
						title: "Shipping",
						source: null,
						chunkCount: 1,
						createdAt: "2026-11-08T10:00:00Z",
					},
				]}
			/>,
		);
		const rows = screen.getAllByRole("row");
		expect(rows).toHaveLength(3);
		expect(rows[1]?.textContent).toContain("Refunds");
		expect(rows[2]?.textContent).toContain("—");
	});
});

describe("SubmitButton", () => {
	test("is disabled in the server HTML (before hydration) and enabled in the browser", async () => {
		const { renderToString } = await import("react-dom/server");
		const html = renderToString(<SubmitButton>Send</SubmitButton>);
		expect(html).toContain("disabled");
		render(<SubmitButton>Send</SubmitButton>);
		expect(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled")).toBe(false);
	});
});
