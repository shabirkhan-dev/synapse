import { describe, expect, test } from "bun:test";

import { AUDIT_ACTIONS, createAuditLog } from "@synapse/audit";

import { AgentsService } from "@/modules/agents";

import { authHeaders, buildTestApp, InMemoryAuditStore, testConfig } from "./helpers";

const versions = { embeddingModel: "mock:embed", chunkerVersion: "text-v1" };

function provenance(inputTokens: number) {
	return {
		chatModel: "mock:chat",
		promptVersion: "chat-assistant@2",
		...versions,
		usage: { inputTokens, outputTokens: 7 },
	};
}

describe("agents", () => {
	test("the overview names models, prompts, tools and limits but never a credential", async () => {
		const { app } = buildTestApp();
		const response = await app.request("/api/v1/agents", { headers: await authHeaders() });
		expect(response.status).toBe(200);
		const text = await response.text();
		const { data } = JSON.parse(text) as {
			data: {
				models: { chat: { provider: string; model: string }; reranker: unknown };
				chat: { promptVersion: string; tools: { name: string; description: string }[] };
				answers: { promptVersions: string[] };
				approvals: { action: string; label: string }[];
			};
		};
		expect(data.models.chat).toEqual({
			provider: testConfig.ai.chat.provider,
			model: testConfig.ai.chat.model,
		});
		expect(data.chat.promptVersion).toMatch(/^chat-assistant@\d+$/);
		expect(data.chat.tools.map((tool) => tool.name)).toEqual([
			"searchDocuments",
			"rememberFact",
			"currentTime",
		]);
		expect(data.answers.promptVersions).toHaveLength(2);
		expect(data.approvals).toEqual([
			{ action: "rag.purge-documents", label: "Delete all documents" },
		]);
		const key = (testConfig.ai.chat as { apiKey?: string }).apiKey;
		if (key) expect(text).not.toContain(key);
		expect(text).not.toContain("apiKey");
	});

	test("runs list chat and cited answers newest first, with tools, citations and tokens", async () => {
		const store = new InMemoryAuditStore();
		const audit = createAuditLog({ store, redact: (data) => data });
		const agents = new AgentsService(testConfig, { versions }, audit);
		const base = { ownerId: "org-1", subjectType: "x", subjectId: null, requestId: null };
		await audit.record({
			...base,
			actorId: "u1",
			action: AUDIT_ACTIONS.RAG_QUERY_ANSWERED,
			data: { question: "Refunds?", answer: "30 days [1]", citedChunkIds: ["c1", "c2"] },
			provenance: { ...provenance(11), promptVersion: "rag-answer@2" },
		});
		await Bun.sleep(5);
		await audit.record({
			...base,
			actorId: "u2",
			action: AUDIT_ACTIONS.CHAT_MESSAGE_ANSWERED,
			data: { finishReason: "stop", steps: 2, tools: ["searchDocuments"] },
			provenance: provenance(20),
		});
		await audit.record({
			...base,
			actorId: "u1",
			action: AUDIT_ACTIONS.RAG_DOCUMENT_INGESTED,
			data: {},
			provenance: null,
		});

		const owner = await agents.runs({ sub: "u1", sid: "s", orgId: "org-1", role: "owner" });
		expect(owner.map((run) => run.agent)).toEqual(["chat", "answer"]);
		expect(owner[0]).toMatchObject({ tools: ["searchDocuments"], steps: 2, inputTokens: 20 });
		expect(owner[1]).toMatchObject({ question: "Refunds?", citations: 2, tools: [] });

		const member = await agents.runs({ sub: "u2", sid: "s", orgId: "org-1", role: "member" });
		expect(member.map((run) => run.actorId)).toEqual(["u2"]);
	});

	test("the routes need a signed-in user", async () => {
		const { app } = buildTestApp();
		expect((await app.request("/api/v1/agents")).status).toBe(401);
		expect((await app.request("/api/v1/agents/runs")).status).toBe(401);
		const runs = await app.request("/api/v1/agents/runs", { headers: await authHeaders() });
		expect(((await runs.json()) as { data: unknown[] }).data).toEqual([]);
	});
});
