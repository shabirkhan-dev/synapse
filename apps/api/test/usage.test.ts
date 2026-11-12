import { describe, expect, test } from "bun:test";

import type { AuditLog, UsageGroup } from "@synapse/audit";
import { MockLanguageModelV4 } from "ai/test";

import { UsageService } from "@/modules/audit";

import { authHeaders, buildTestApp, textGenerateResult } from "./helpers";

const NOW = new Date("2026-11-12T15:00:00Z");
const group = (day: string, chatModel: string, answers: number, input: number, output: number) => ({
	day,
	chatModel,
	promptVersion: "rag-answer@2",
	embeddingModel: "openai:text-embedding-3-small",
	answers,
	inputTokens: input,
	outputTokens: output,
});

function service(groups: UsageGroup[], calls: unknown[] = []) {
	const audit = {
		usage: async (ownerId: string, input: unknown) => {
			calls.push({ ownerId, ...(input as object) });
			return groups;
		},
	} as unknown as AuditLog;
	return new UsageService({
		audit,
		prices: { "openai:gpt-4o-mini": { inputPerMillionTokens: 0.15, outputPerMillionTokens: 0.6 } },
		now: () => NOW,
	});
}

describe("UsageService", () => {
	test("fills every day of the window, totals tokens and prices only priced models", async () => {
		const calls: unknown[] = [];
		const usage = await service(
			[
				group("2026-11-10", "openai:gpt-4o-mini", 2, 1_000_000, 100_000),
				group("2026-11-12", "openai:gpt-4o-mini", 1, 0, 0),
				group("2026-11-12", "local:llama", 3, 300, 30),
			],
			calls,
		).summarize({ sub: "u1", sid: "s", orgId: "org-1", role: "admin" }, 3);

		expect(usage.scope).toBe("organization");
		expect(usage.since).toBe("2026-11-10T00:00:00.000Z");
		expect(calls).toEqual([{ ownerId: "org-1", since: new Date("2026-11-10T00:00:00Z") }]);
		expect(usage.daily.map((day) => [day.day, day.answers])).toEqual([
			["2026-11-10", 2],
			["2026-11-11", 0],
			["2026-11-12", 4],
		]);
		expect(usage.totals).toMatchObject({
			answers: 6,
			inputTokens: 1_000_300,
			outputTokens: 100_030,
		});
		// 1M input × $0.15 + 100k output × $0.60 per million.
		expect(usage.totals.costUsd).toBeCloseTo(0.21, 10);
		expect(usage.totals.unpricedAnswers).toBe(3);
		expect(usage.models.map((m) => [m.chatModel, m.answers, m.costUsd === null])).toEqual([
			["openai:gpt-4o-mini", 3, false],
			["local:llama", 3, true],
		]);
	});

	test("a member sees only their own answers; no priced model means no cost", async () => {
		const calls: unknown[] = [];
		const usage = await service([group("2026-11-12", "local:llama", 1, 5, 5)], calls).summarize(
			{ sub: "u2", sid: "s", orgId: "org-1", role: "member" },
			1,
		);
		expect(usage.scope).toBe("you");
		expect(calls).toEqual([
			{ ownerId: "org-1", since: new Date("2026-11-12T00:00:00Z"), actorId: "u2" },
		]);
		expect(usage.totals.costUsd).toBeNull();
	});
});

describe("GET /audit/usage", () => {
	test("counts answered queries with their tokens and models; retrieval-only searches are not answers", async () => {
		const chatModel = new MockLanguageModelV4({ doGenerate: textGenerateResult("30 days [1].") });
		const { app } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers,
			body: JSON.stringify({
				title: "Refund policy",
				content: "Refunds are accepted within 30 days.",
			}),
		});
		for (const answer of [true, true, false]) {
			// oxlint-disable-next-line no-await-in-loop
			await app.request("/api/v1/rag/query", {
				method: "POST",
				headers,
				body: JSON.stringify({ query: "How long for refunds?", answer }),
			});
		}
		const response = await app.request("/api/v1/audit/usage?days=7", { headers });
		expect(response.status).toBe(200);
		const { data } = await response.json();
		expect(data.days).toBe(7);
		expect(data.daily).toHaveLength(7);
		expect(data.daily.at(-1).answers).toBe(2);
		expect(data.totals).toMatchObject({ answers: 2, inputTokens: 20, outputTokens: 10 });
		expect(data.models).toHaveLength(1);
		expect(data.models[0].answers).toBe(2);

		expect((await app.request("/api/v1/audit/usage?days=91", { headers })).status).toBe(422);
		expect((await app.request("/api/v1/audit/usage")).status).toBe(401);
	});
});
