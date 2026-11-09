import { describe, expect, test } from "bun:test";

import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import {
	authHeaders,
	buildTestApp,
	createMockEmbeddingModel,
	testReliability,
	textGenerateResult,
} from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";
const refundDoc = { title: "Refund policy", content: "Refunds are accepted within 30 days." };

async function call(app: App, method: string, path: string, body?: unknown) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: await authHeaders(),
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

const providerError = (statusCode: number) =>
	new APICallError({
		message: `provider ${statusCode}`,
		url: "https://models.test/v1/chat/completions",
		requestBodyValues: {},
		statusCode,
	});

/** A chat model that fails with `statusCode` for the first `failures` calls, then answers. */
function flakyChat(failures: number, statusCode = 503) {
	let calls = 0;
	const model = new MockLanguageModelV4({
		doGenerate: async () => {
			calls += 1;
			if (calls <= failures) throw providerError(statusCode);
			return textGenerateResult("Within 30 days [1].");
		},
	});
	return { model, calls: () => calls };
}

async function ask(app: App) {
	return call(app, "POST", "/rag/query", { query: "how long do refunds take?" });
}

describe("model reliability", () => {
	test("a transient 503 is retried and the answer still arrives", async () => {
		const chat = flakyChat(2);
		const { app } = buildTestApp({ chatModel: chat.model });
		await call(app, "POST", "/rag/documents", refundDoc);
		const answer = await ask(app);
		expect(answer.status).toBe(200);
		expect(answer.body.data.answer).toBe("Within 30 days [1].");
		expect(chat.calls()).toBe(3);
	});

	test("a bad request is not retried", async () => {
		const chat = flakyChat(1, 400);
		const { app } = buildTestApp({ chatModel: chat.model });
		await call(app, "POST", "/rag/documents", refundDoc);
		expect((await ask(app)).status).toBe(500);
		expect(chat.calls()).toBe(1);
	});

	test("repeated failures open the circuit: later requests fail fast with 503", async () => {
		const chat = flakyChat(Number.POSITIVE_INFINITY);
		const { app } = buildTestApp({
			chatModel: chat.model,
			reliability: { ...testReliability, breaker: { failureThreshold: 2, resetAfterMs: 60_000 } },
		});
		await call(app, "POST", "/rag/documents", refundDoc);
		const first = await ask(app);
		expect(first.status).toBe(503);
		expect(first.body.error.code).toBe("RELIABILITY_CIRCUIT_OPEN");
		expect(chat.calls()).toBe(2);

		const second = await ask(app);
		expect(second.status).toBe(503);
		expect(chat.calls()).toBe(2);
	});

	test("a hanging provider times out with 504", async () => {
		const hanging = new MockLanguageModelV4({ doGenerate: () => new Promise(() => {}) });
		const { app } = buildTestApp({
			chatModel: hanging,
			reliability: {
				...testReliability,
				chatTimeoutMs: 30,
				retry: { ...testReliability.retry, attempts: 2 },
			},
		});
		await call(app, "POST", "/rag/documents", refundDoc);
		const answer = await ask(app);
		expect(answer.status).toBe(504);
		expect(answer.body.error.code).toBe("RELIABILITY_TIMEOUT");
		expect(hanging.doGenerateCalls).toHaveLength(2);
	});

	test("the fallback model answers when the primary is down, and provenance names it", async () => {
		const chat = flakyChat(Number.POSITIVE_INFINITY);
		const fallback = new MockLanguageModelV4({
			doGenerate: textGenerateResult("Within 30 days [1]."),
		});
		const { app } = buildTestApp({ chatModel: chat.model, fallbackChatModel: fallback });
		await call(app, "POST", "/rag/documents", refundDoc);
		const answer = await ask(app);
		expect(answer.status).toBe(200);
		expect(answer.body.data.provenance.chatModel).toBe("mock:mock-fallback");
		expect(chat.calls()).toBe(testReliability.retry.attempts);
	});

	test("embedding failures are retried during ingest", async () => {
		const healthy = createMockEmbeddingModel();
		let calls = 0;
		const embeddingModel = createMockEmbeddingModel();
		embeddingModel.doEmbed = async (options) => {
			calls += 1;
			if (calls === 1) throw providerError(502);
			return healthy.doEmbed(options);
		};
		const { app } = buildTestApp({ embeddingModel });
		expect((await call(app, "POST", "/rag/documents", refundDoc)).status).toBe(201);
		expect(calls).toBe(2);
	});
});
