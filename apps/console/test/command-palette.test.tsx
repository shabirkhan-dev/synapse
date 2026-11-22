import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import { type Call, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

const push = mock();
mock.module("next/navigation", () => ({
	useRouter: () => ({ push, replace: mock(), back: mock() }),
	usePathname: () => "/documents",
	useSearchParams: () => new URLSearchParams(),
}));

const { CommandPaletteContainer } = await import("@/features/command-palette");
const { setAccessToken } = await import("@/lib/api/session");

afterEach(() => {
	cleanup();
	setAccessToken(null);
	push.mockClear();
});

const documents = [
	{
		id: "d1",
		title: "Refund policy",
		source: null,
		chunkCount: 1,
		createdAt: "2026-11-17T09:00:00Z",
	},
];
const conversations = [
	{
		id: "c1",
		title: "Shipping to Norway",
		createdAt: "2026-11-17T09:00:00Z",
		updatedAt: "2026-11-17T09:00:00Z",
	},
];

function api() {
	return mockFetch((call: Call) => {
		if (call.url.endsWith("/rag/documents")) return ok(documents);
		if (call.url.endsWith("/memory/conversations")) return ok(conversations);
		throw new Error(`unexpected ${call.url}`);
	});
}

describe("CommandPaletteContainer", () => {
	test("loads nothing until opened; Ctrl+K opens it with pages, conversations and documents", async () => {
		signedIn();
		const calls = api();
		renderWithQuery(<CommandPaletteContainer />);
		expect(calls).toHaveLength(0);
		expect(screen.queryByRole("dialog")).toBeNull();

		fireEvent.keyDown(window, { key: "k", ctrlKey: true });
		const dialog = await screen.findByRole("dialog", { name: "Search Synapse" });
		await within(dialog).findByText("Refund policy");
		await within(dialog).findByText("Shipping to Norway");
		expect(within(dialog).getByText("Evaluations")).toBeDefined();
		expect(within(dialog).getByText("Account")).toBeDefined();
		expect(calls.map((call) => new URL(call.url).pathname).toSorted()).toEqual([
			"/api/v1/memory/conversations",
			"/api/v1/rag/documents",
		]);
	});

	test("/ opens it too, but not while typing in a field", async () => {
		signedIn();
		api();
		renderWithQuery(
			<>
				<input aria-label="Somewhere to type" />
				<CommandPaletteContainer />
			</>,
		);
		const field = screen.getByLabelText("Somewhere to type");
		fireEvent.keyDown(field, { key: "/" });
		expect(screen.queryByRole("dialog", { name: "Search Synapse" })).toBeNull();
		fireEvent.keyDown(window, { key: "/" });
		await screen.findByRole("dialog", { name: "Search Synapse" });
	});

	test("typing narrows the list; choosing an entry goes there and closes the palette", async () => {
		signedIn();
		api();
		renderWithQuery(<CommandPaletteContainer />);
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
		const dialog = await screen.findByRole("dialog", { name: "Search Synapse" });
		await within(dialog).findByText("Refund policy");

		fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "refund" } });
		await waitFor(() => expect(within(dialog).queryByText("Evaluations")).toBeNull());
		fireEvent.click(within(dialog).getByText("Refund policy"));
		expect(push).toHaveBeenCalledWith("/documents/d1");
		// Closed (Base UI keeps it mounted until its exit animation, which happy-dom never runs).
		await waitFor(() =>
			expect(screen.queryByRole("dialog")?.hasAttribute("data-closed") ?? true).toBe(true),
		);

		fireEvent.keyDown(window, { key: "k", metaKey: true });
		const again = await screen.findByRole("dialog", { name: "Search Synapse" });
		fireEvent.click(await within(again).findByText("Shipping to Norway"));
		expect(push).toHaveBeenCalledWith("/chat?c=c1");
	});
});
