import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

import { mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

mock.module("next/navigation", () => ({
	useRouter: () => ({ replace: mock(), push: mock(), back: mock() }),
	usePathname: () => "/documents",
	useSearchParams: () => new URLSearchParams(),
}));

const { GettingStartedContainer } = await import("@/features/onboarding");
const { setAccessToken } = await import("@/lib/api/session");

afterEach(() => {
	cleanup();
	setAccessToken(null);
	localStorage.clear();
});

const me = {
	id: "u1",
	email: "ada@example.com",
	emailVerifiedAt: null,
	organization: { id: "org-1", role: "owner" },
};

function api() {
	const documents: Array<{ id: string; title: string }> = [];
	const calls = mockFetch((call) => {
		if (call.url.endsWith("/auth/me")) return ok(me);
		if (call.url.endsWith("/memory/conversations")) return ok([]);
		if (call.url.endsWith("/rag/documents") && call.method === "POST") {
			const { title } = call.body as { title: string };
			const document = { id: `d${documents.length + 1}`, title };
			documents.push(document);
			return ok(
				{ ...document, source: null, chunkCount: 2, createdAt: "2026-11-22T10:00:00Z" },
				201,
			);
		}
		if (call.url.endsWith("/rag/documents")) {
			return ok(
				documents.map((document) => ({
					...document,
					source: null,
					chunkCount: 2,
					createdAt: "2026-11-22T10:00:00Z",
				})),
			);
		}
		throw new Error(`unexpected ${call.method} ${call.url}`);
	});
	return calls;
}

describe("GettingStartedContainer", () => {
	test("a new workspace adds three samples through ingest; the step is then done", async () => {
		signedIn();
		const calls = api();
		renderWithQuery(<GettingStartedContainer />);
		fireEvent.click(await screen.findByRole("button", { name: "Add sample documents" }));
		await screen.findByText("Done");
		const added = calls.filter((call) => call.method === "POST").map((call) => call.body);
		expect(added).toHaveLength(3);
		expect(added.map((body) => (body as { title: string }).title)).toEqual([
			"Sample · Returns and refunds",
			"Sample · Shipping and delivery",
			"Sample · Product warranty",
		]);
		expect(screen.getByText("1/3")).toBeDefined();
		expect(screen.queryByRole("button", { name: "Add sample documents" })).toBeNull();
	});

	test("the Playground step is remembered; Hide puts the card away for this workspace", async () => {
		signedIn();
		api();
		const { unmount } = renderWithQuery(<GettingStartedContainer />);
		fireEvent.click(await screen.findByRole("link", { name: "Open the Playground" }));
		await screen.findByText("1/3");
		fireEvent.click(screen.getByRole("button", { name: "Hide Get started" }));
		await waitFor(() => expect(screen.queryByText("Get started")).toBeNull());
		expect(JSON.parse(localStorage.getItem("synapse.onboarding.v1.org-1") ?? "{}")).toEqual({
			dismissed: true,
			triedPlayground: true,
		});
		unmount();
		renderWithQuery(<GettingStartedContainer />);
		// Hidden for good: still nothing once everything has loaded.
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(screen.queryByText("Get started")).toBeNull();
	});
});
