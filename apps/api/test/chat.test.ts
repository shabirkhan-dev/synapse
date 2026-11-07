import { describe, expect, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";

import { createChatTools } from "@/modules/chat/chat.tools";

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
			JSON.stringify(["searchDocuments", "currentTime"]),
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
		expect((await response.json()).code).toBe("CHAT_INVALID_MESSAGES");
	});

	test("currentTime falls back to UTC for unknown zones", async () => {
		const { rag } = buildTestApp();
		const tools = createChatTools({
			rag,
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
});
