import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, screen, within } from "@testing-library/react";

import { AgentsContainer } from "@/features/agents";
import { setAccessToken } from "@/lib/api/session";

import { mockFetch, ok, renderWithQuery, signedIn } from "./helpers";

afterEach(() => {
	cleanup();
	setAccessToken(null);
});

const overview = {
	models: {
		chat: { provider: "openai-compatible", model: "openai/gpt-4o-mini" },
		fallbackChat: null,
		embedding: { provider: "openai-compatible", model: "openai/text-embedding-3-small" },
		reranker: null,
	},
	chat: {
		promptVersion: "chat-assistant@2",
		maxSteps: 5,
		history: { maxTokens: 4000, maxMessages: 20 },
		tools: [
			{ name: "searchDocuments", description: "Search the user's ingested documents." },
			{ name: "currentTime", description: "Get the current date and time." },
		],
	},
	answers: {
		promptVersions: ["rag-answer@2", "rag-answer-cited@2"],
		searchMode: "hybrid",
		topK: 5,
		maxContextTokens: 3000,
	},
	index: { embeddingModel: "openai/text-embedding-3-small", chunkerVersion: "text-v1" },
	guardrails: { maxInputChars: 4000, blockedTerms: 0, allowedTools: ["searchDocuments"] },
	approvals: [{ action: "rag.purge-documents", label: "Delete all documents" }],
};

const run = (overrides: Record<string, unknown>) => ({
	id: crypto.randomUUID(),
	agent: "chat",
	actorId: "u1",
	createdAt: "2026-11-13T09:00:00Z",
	question: null,
	chatModel: "openai-compatible:openai/gpt-4o-mini",
	promptVersion: "chat-assistant@2",
	tools: [],
	citations: null,
	steps: 1,
	inputTokens: 1200,
	outputTokens: 80,
	...overrides,
});

describe("AgentsContainer (mocked API)", () => {
	test("shows each assistant's setup and the latest runs", async () => {
		signedIn();
		mockFetch((call) => {
			const path = new URL(call.url).pathname.replace("/api/v1", "");
			if (path === "/agents") return ok(overview);
			if (path === "/agents/runs") {
				return ok([
					run({ tools: ["searchDocuments"] }),
					run({ agent: "answer", actorId: "u2", question: "Refunds?", citations: 2, tools: [] }),
				]);
			}
			if (path === "/auth/me") {
				return ok({
					id: "u1",
					email: "ada@example.com",
					emailVerifiedAt: null,
					createdAt: "2026-11-01T00:00:00Z",
					organization: { id: "u1", role: "owner" },
				});
			}
			throw new Error(`unexpected ${path}`);
		});
		renderWithQuery(<AgentsContainer />);

		await screen.findByRole("heading", { name: "Chat assistant" });
		expect(screen.getByText("rag-answer@2 → rag-answer-cited@2")).toBeDefined();
		expect(screen.getByText("Blocked by guardrails")).toBeDefined();
		expect(screen.getByText(/Delete all documents/)).toBeDefined();

		const mine = (await screen.findByRole("cell", { name: "Used searchDocuments" })).closest("tr");
		expect(within(mine as HTMLElement).getByText("You")).toBeDefined();
		const answer = screen.getByRole("cell", { name: "Refunds?" }).closest("tr");
		expect(within(answer as HTMLElement).getByText("Cited 2 passages")).toBeDefined();
		expect(within(answer as HTMLElement).getByText("A member")).toBeDefined();
	});
});
