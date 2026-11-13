import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, screen, within } from "@testing-library/react";

import { SystemContainer } from "@/features/system";
import { setAccessToken } from "@/lib/api/session";

import { failure, mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const status = {
	checkedAt: "2026-11-13T10:00:00Z",
	uptimeSeconds: 7_500,
	database: { ok: true, latencyMs: 3 },
	circuits: [
		{ name: "chat", state: "open", since: "2026-11-13T09:59:00Z", resetAfterMs: 30_000 },
		{ name: "embeddings", state: "closed", since: null, resetAfterMs: 30_000 },
	],
	jobs: {
		counts: [
			{ queue: "knowledge.reembed-chunks", state: "completed", count: 4 },
			{ queue: "knowledge.reembed-chunks", state: "failed", count: 1 },
		],
		checkpoints: [],
	},
	index: {
		embeddingModel: "openai/text-embedding-3-small",
		chunkerVersion: "text-v1",
		chunkModels: [
			{ embeddingModel: "openai/text-embedding-3-small", chunks: 120, current: true },
			{ embeddingModel: "openai/text-embedding-ada-002", chunks: 8, current: false },
		],
	},
	traces: { destination: "langfuse", host: "cloud.langfuse.com" },
};

describe("SystemContainer (mocked API)", () => {
	test("summarizes dependencies, a failing circuit, failed jobs and old chunks", async () => {
		signedIn();
		mockFetch(() => ok(status));
		renderWithQuery(<SystemContainer />);

		await screen.findByText("Reachable");
		expect(screen.getByText("1 failing")).toBeDefined();
		expect(screen.getByText("1 failed")).toBeDefined();
		expect(screen.getByText("Up 2 h 5 min")).toBeDefined();
		const chat = screen.getByRole("cell", { name: "Chat model" }).closest("tr");
		expect(within(chat as HTMLElement).getByText("Failing fast")).toBeDefined();
		expect(screen.getByText(/8 chunks use an older model/)).toBeDefined();
		expect(screen.getByText("cloud.langfuse.com")).toBeDefined();
	});

	test("a member is told who can see it instead of an error", async () => {
		signedIn();
		mockFetch(() => failure(403, "FORBIDDEN", "Only admins and owners can see the system status"));
		renderWithQuery(<SystemContainer />);
		await screen.findByText(/Only admins and owners can see the system status\. Ask one/);
		expect(screen.queryByRole("alert")).toBeNull();
	});
});
