import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { ModelGateway } from "@synapse/core/contracts";

import {
	createLogger,
	estimateCostUsd,
	InMemorySpanExporter,
	instrumentModelGateway,
	instrumentReranker,
	type LogLevel,
	startTracing,
	type Tracing,
	withSpan,
} from "../src";

let exporter: InMemorySpanExporter;
let tracing: Tracing;

beforeEach(() => {
	exporter = new InMemorySpanExporter();
	tracing = startTracing({ serviceName: "test", exporter });
});

afterEach(async () => {
	await tracing.shutdown();
});

const gateway = (): ModelGateway & { chatModel: string } => ({
	chatModel: "raw-handle",
	chat: {
		info: { provider: "test", model: "chat-1" },
		generateText: async () => ({
			text: "hi",
			model: { provider: "test", model: "chat-1" },
			usage: { inputTokens: 1000, outputTokens: 500 },
		}),
	},
	embedding: {
		info: { provider: "test", model: "embed-1" },
		embed: async () => [1],
		embedMany: async (values) => values.map(() => [1]),
	},
});

describe("withSpan", () => {
	test("nests spans and records errors", async () => {
		await withSpan("parent", { a: 1 }, () => withSpan("child", {}, async () => "ok"));
		await withSpan("fails", {}, async () => {
			throw new Error("nope");
		}).catch(() => undefined);

		const spans = exporter.getFinishedSpans();
		const parent = spans.find((s) => s.name === "parent");
		const child = spans.find((s) => s.name === "child");
		expect(child?.parentSpanContext?.spanId).toBe(parent?.spanContext().spanId);
		expect(parent?.attributes).toEqual({ a: 1 });
		const failed = spans.find((s) => s.name === "fails");
		expect(failed?.status).toEqual({ code: 2, message: "nope" });
		expect(failed?.events[0]?.name).toBe("exception");
	});
});

describe("instrumentModelGateway", () => {
	test("traces chat and embedding calls, logs usage and cost, keeps extra properties", async () => {
		const lines: string[] = [];
		const logger = createLogger({
			service: "test",
			format: "json",
			sink: (line: string, _level: LogLevel) => lines.push(line),
		});
		const instrumented = instrumentModelGateway(gateway(), {
			logger,
			prices: { "test:chat-1": { inputPerMillionTokens: 1, outputPerMillionTokens: 2 } },
		});
		expect(instrumented.chatModel).toBe("raw-handle");

		await instrumented.chat.generateText({ prompt: "x" });
		await instrumented.embedding.embedMany(["a", "b"]);

		const [chatSpan, embedSpan] = exporter.getFinishedSpans();
		expect(chatSpan?.name).toBe("chat chat-1");
		expect(chatSpan?.attributes).toMatchObject({
			"gen_ai.operation.name": "chat",
			"gen_ai.provider.name": "test",
			"gen_ai.request.model": "chat-1",
			"gen_ai.usage.input_tokens": 1000,
			"gen_ai.usage.output_tokens": 500,
			"gen_ai.usage.cost": 0.002,
		});
		expect(embedSpan?.name).toBe("embeddings embed-1");
		expect(embedSpan?.attributes["synapse.embedding.inputs"]).toBe(2);

		const logged = lines.map((line) => JSON.parse(line));
		expect(logged[0]).toMatchObject({ msg: "llm call", model: "test:chat-1", costUsd: 0.002 });
		expect(logged[1]).toMatchObject({ operation: "embeddings", inputs: 2 });
	});
});

describe("instrumentReranker", () => {
	test("one span and log line per rerank, with the document count", async () => {
		const lines: string[] = [];
		const logger = createLogger({
			service: "test",
			format: "json",
			sink: (line: string, _level: LogLevel) => lines.push(line),
		});
		const reranker = instrumentReranker(
			{
				info: { provider: "test", model: "rerank-1" },
				rerank: async () => [{ index: 1, score: 0.9 }],
			},
			{ logger },
		);
		expect(await reranker.rerank({ query: "q", documents: ["a", "b"], topN: 1 })).toEqual([
			{ index: 1, score: 0.9 },
		]);
		const [span] = exporter.getFinishedSpans();
		expect(span?.name).toBe("rerank rerank-1");
		expect(span?.attributes).toMatchObject({
			"gen_ai.operation.name": "rerank",
			"gen_ai.provider.name": "test",
			"synapse.rerank.documents": 2,
		});
		expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({ operation: "rerank", documents: 2 });
	});
});

describe("estimateCostUsd", () => {
	test("prices input and output tokens per million", () => {
		expect(
			estimateCostUsd(
				{ inputTokens: 2_000_000, outputTokens: 500_000 },
				{ inputPerMillionTokens: 0.15, outputPerMillionTokens: 0.6 },
			),
		).toBeCloseTo(0.6, 10);
		expect(estimateCostUsd({}, { inputPerMillionTokens: 1, outputPerMillionTokens: 1 })).toBe(0);
	});
});
