import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { InMemorySpanExporter, startTracing, type Tracing } from "@synapse/observability";

import { MockLanguageModelV4 } from "ai/test";

import { authHeaders, buildTestApp, textGenerateResult } from "./helpers";

let exporter: InMemorySpanExporter;
let tracing: Tracing;

beforeAll(() => {
	exporter = new InMemorySpanExporter();
	tracing = startTracing({ serviceName: "api-test", exporter });
});

afterAll(async () => {
	await tracing.shutdown();
});

describe("request tracing", () => {
	test("a query produces a route-named request span with LLM spans as children", async () => {
		// A cited answer: one generation (an uncited one would be retried, adding a second chat span).
		const chatModel = new MockLanguageModelV4({ doGenerate: textGenerateResult("30 days [1]") });
		const { app } = buildTestApp({ chatModel });
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ title: "Refunds", content: "Refunds are accepted within 30 days." }),
		});
		exporter.reset();

		const response = await app.request("/api/v1/rag/query", {
			method: "POST",
			headers: { ...(await authHeaders()), "x-request-id": "req_trace_test" },
			body: JSON.stringify({ query: "refund window" }),
		});
		expect(response.status).toBe(200);

		const spans = exporter.getFinishedSpans();
		const request = spans.find((span) => span.name === "POST /api/v1/rag/query");
		expect(request?.attributes).toMatchObject({
			"http.request.method": "POST",
			"http.route": "/api/v1/rag/query",
			"http.response.status_code": 200,
			"synapse.request_id": "req_trace_test",
		});

		const children = spans.filter(
			(span) => span.parentSpanContext?.spanId === request?.spanContext().spanId,
		);
		expect(children.map((span) => span.name).toSorted()).toEqual([
			"chat mock-chat",
			"embeddings mock-embedding",
		]);
		expect(new Set(spans.map((span) => span.spanContext().traceId)).size).toBe(1);
	});

	test("route patterns keep span names low-cardinality", async () => {
		const { app } = buildTestApp();
		exporter.reset();
		await app.request("/api/v1/rag/documents/00000000-0000-4000-8000-000000000000", {
			method: "DELETE",
			headers: await authHeaders(),
		});
		const [span] = exporter.getFinishedSpans();
		expect(span?.name).toBe("DELETE /api/v1/rag/documents/:id");
		expect(span?.attributes["http.response.status_code"]).toBe(404);
	});
});
