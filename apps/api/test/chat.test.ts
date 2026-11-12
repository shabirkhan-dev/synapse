import { describe, expect, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

import { createChatTools } from "@/modules/chat";

import {
	authHeaders,
	buildTestApp,
	streamResult,
	textStreamParts,
	toolCallStreamParts,
} from "./helpers";

const userMessage = (text: string) => ({
	id: crypto.randomUUID(),
	role: "user",
	parts: [{ type: "text", text }],
});

async function readStream(response: Response): Promise<Array<Record<string, unknown>>> {
	const text = await response.text();
	return text
		.split("\n")
		.filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
		.map((line) => JSON.parse(line.slice("data: ".length)));
}

describe("chat", () => {
	test("streams text in the AI SDK UI message protocol", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: streamResult(textStreamParts("Hello from the mock")),
		});
		const { app } = buildTestApp({ chatModel });
		const response = await app.request("/api/v1/chat", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ messages: [userMessage("hi")] }),
		});
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/event-stream");
		expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
		const events = await readStream(response);
		expect(events.find((e) => e.type === "text-delta")?.delta).toBe("Hello from the mock");
		expect(events.at(-1)?.type).toBe("finish");
		expect(JSON.stringify(chatModel.doStreamCalls[0]?.tools?.map((t) => t.name))).toBe(
			JSON.stringify(["searchDocuments", "rememberFact", "currentTime"]),
		);
	});

	test("runs the RAG search tool and feeds the result back to the model", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: [
				streamResult(toolCallStreamParts("searchDocuments", { query: "refund window" })),
				streamResult(textStreamParts("Refunds are allowed for 30 days.")),
			],
		});
		const { app } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers,
			body: JSON.stringify({
				title: "Refunds",
				content: "A refund window of 30 days applies to all orders.",
			}),
		});

		const response = await app.request("/api/v1/chat", {
			method: "POST",
			headers,
			body: JSON.stringify({ messages: [userMessage("What is the refund window?")] }),
		});
		const events = await readStream(response);
		const toolOutput = events.find((e) => e.type === "tool-output-available");
		expect(toolOutput).toBeDefined();
		expect(JSON.stringify(toolOutput?.output)).toContain("refund window of 30 days");
		expect(events.find((e) => e.type === "text-delta")?.delta).toBe(
			"Refunds are allowed for 30 days.",
		);
		expect(chatModel.doStreamCalls).toHaveLength(2);
		expect(JSON.stringify(chatModel.doStreamCalls[1]?.prompt)).toContain(
			"refund window of 30 days",
		);
	});

	test("runs the current time tool", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: [
				streamResult(toolCallStreamParts("currentTime", { timeZone: "Asia/Karachi" })),
				streamResult(textStreamParts("It is late.")),
			],
		});
		const { app } = buildTestApp({ chatModel });
		const response = await app.request("/api/v1/chat", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ messages: [userMessage("what time is it in Karachi?")] }),
		});
		const output = (await readStream(response)).find((e) => e.type === "tool-output-available")
			?.output as {
			timeZone: string;
		};
		expect(output.timeZone).toBe("Asia/Karachi");
	});

	test("rejects malformed UI messages", async () => {
		const { app } = buildTestApp();
		const response = await app.request("/api/v1/chat", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ messages: [{ role: "user" }] }),
		});
		expect(response.status).toBe(422);
		expect((await response.json()).error.code).toBe("CHAT_INVALID_MESSAGES");
	});

	test("currentTime falls back to UTC for unknown zones", async () => {
		const { rag, memory, guardrails } = buildTestApp();
		const tools = createChatTools({
			rag,
			memory,
			guardrails,
			ownerId: "u",
			topK: 3,
			now: () => new Date("2026-10-31T12:00:00Z"),
		});
		const result = await tools.currentTime.execute?.(
			{ timeZone: "Mars/Olympus" },
			{ toolCallId: "t", messages: [], context: {} },
		);
		expect(result).toMatchObject({ iso: "2026-10-31T12:00:00.000Z", timeZone: "UTC" });
	});

	test("every chat answer is recorded with its provenance (architecture rule 6)", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: streamResult(textStreamParts("Hello from the mock")),
		});
		const { app, auditEvents } = buildTestApp({ chatModel });
		const response = await app.request("/api/v1/chat", {
			method: "POST",
			headers: { ...(await authHeaders()), "x-request-id": "req_chat_1" },
			body: JSON.stringify({ message: userMessage("hi") }),
		});
		await readStream(response);
		const conversationId = response.headers.get("x-conversation-id");
		await waitFor(() => auditEvents.events.some((e) => e.action === "chat.message.answered"));
		const answered = auditEvents.events.filter((e) => e.action === "chat.message.answered");
		expect(answered).toHaveLength(1);
		expect(answered[0]).toMatchObject({
			ownerId: "user-1",
			actorId: "user-1",
			subjectType: "conversation",
			subjectId: conversationId,
			requestId: "req_chat_1",
			data: { finishReason: "stop", steps: 1, tools: [] },
			provenance: {
				chatModel: "mock:mock-chat",
				promptVersion: expect.stringMatching(/^chat-assistant@\d+$/),
				embeddingModel: "mock:mock-embedding",
				chunkerVersion: expect.stringContaining("text-v1"),
				usage: { inputTokens: 10, outputTokens: 5 },
			},
		});
	});

	test("a tool-using answer records the tools and the tokens of every step", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: [
				streamResult(toolCallStreamParts("searchDocuments", { query: "refund window" })),
				streamResult(textStreamParts("Refunds are allowed for 30 days.")),
			],
		});
		const { app, auditEvents } = buildTestApp({ chatModel });
		await readStream(
			await app.request("/api/v1/chat", {
				method: "POST",
				headers: await authHeaders(),
				body: JSON.stringify({ messages: [userMessage("refunds?")] }),
			}),
		);
		await waitFor(() => auditEvents.events.some((e) => e.action === "chat.message.answered"));
		const answered = auditEvents.events.find((e) => e.action === "chat.message.answered");
		expect(answered?.data).toEqual({ finishReason: "stop", steps: 2, tools: ["searchDocuments"] });
		expect(answered?.provenance?.usage).toEqual({ inputTokens: 20, outputTokens: 10 });
		// Usage counts it as a chat answer.
		const usage = (
			await (
				await app.request("/api/v1/audit/usage?days=1", { headers: await authHeaders() })
			).json()
		).data;
		expect(usage.models).toEqual([expect.objectContaining({ source: "chat", answers: 1 })]);
	});

	test("a stopped stream is still recorded, with the steps that finished", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: async () => ({
				stream: new ReadableStream({
					start(controller) {
						controller.enqueue({ type: "stream-start", warnings: [] });
						controller.enqueue({ type: "text-start", id: "t" });
						controller.enqueue({ type: "text-delta", id: "t", delta: "Partial" });
						// Never finishes: the reader stops it.
					},
				}),
			}),
		});
		const { app, auditEvents } = buildTestApp({ chatModel });
		const stop = new AbortController();
		const response = await app.request("/api/v1/chat", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ messages: [userMessage("hi")] }),
			signal: stop.signal,
		});
		const reader = response.body?.getReader();
		await reader?.read();
		stop.abort();
		await reader?.cancel().catch(() => {});
		await waitFor(() => auditEvents.events.some((e) => e.action === "chat.message.answered"));
		const answered = auditEvents.events.find((e) => e.action === "chat.message.answered");
		expect(answered?.data).toMatchObject({ finishReason: "aborted", steps: 0 });
		expect(answered?.provenance?.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
	});

	test("a failed audit write does not break the answer already streaming", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: streamResult(textStreamParts("Still answered")),
		});
		const { app, auditEvents } = buildTestApp({ chatModel });
		auditEvents.append = async () => {
			throw new Error("audit store down");
		};
		const events = await readStream(
			await app.request("/api/v1/chat", {
				method: "POST",
				headers: await authHeaders(),
				body: JSON.stringify({ messages: [userMessage("hi")] }),
			}),
		);
		expect(events.find((e) => e.type === "text-delta")?.delta).toBe("Still answered");
		expect(events.at(-1)?.type).toBe("finish");
	});
});

/** The recording runs after the stream; poll briefly instead of sleeping a fixed time. */
async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
	const started = Date.now();
	while (!condition()) {
		if (Date.now() - started > timeoutMs) throw new Error("condition not met in time");
		// oxlint-disable-next-line no-await-in-loop
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}
