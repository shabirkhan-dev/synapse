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

/** The reply text: every text delta, in order (a word is sent once the next one starts). */
const streamedText = (events: Array<Record<string, unknown>>) =>
	events
		.filter((e) => e.type === "text-delta")
		.map((e) => e.delta)
		.join("");

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
		expect(streamedText(events)).toBe("Hello from the mock");
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
		expect(streamedText(events)).toBe("Refunds are allowed for 30 days.");
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

	test("search results carry citation numbers that keep counting across searches in one reply", async () => {
		const { app, rag, memory, guardrails } = buildTestApp();
		const headers = await authHeaders();
		await Promise.all(
			["Refunds", "Shipping"].map((title) =>
				app.request("/api/v1/rag/documents", {
					method: "POST",
					headers,
					body: JSON.stringify({ title, content: `${title} policy text for the citation test.` }),
				}),
			),
		);
		const tools = createChatTools({ rag, memory, guardrails, ownerId: "user-1", topK: 2 });
		const options = { toolCallId: "t", messages: [], context: {} };
		const first = (await tools.searchDocuments.execute?.({ query: "policy" }, options)) as {
			citation: number;
		}[];
		const second = (await tools.searchDocuments.execute?.({ query: "policy" }, options)) as {
			citation: number;
		}[];
		expect(first.map((match) => match.citation)).toEqual([1, 2]);
		expect(second.map((match) => match.citation)).toEqual([3, 4]);
	});

	test("a turn narrowed to chosen documents searches only them, and its audit record says so", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: [
				streamResult(toolCallStreamParts("searchDocuments", { query: "policy" })),
				streamResult(textStreamParts("Shipping only.")),
			],
		});
		const { app, auditEvents } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		const ids = await Promise.all(
			["Refunds", "Shipping"].map(async (title) => {
				const response = await app.request("/api/v1/rag/documents", {
					method: "POST",
					headers,
					body: JSON.stringify({ title, content: `${title} policy text for the scope test.` }),
				});
				return (await response.json()).data.id as string;
			}),
		);
		const shipping = ids[1] as string;
		const events = await readStream(
			await app.request("/api/v1/chat", {
				method: "POST",
				headers,
				body: JSON.stringify({ messages: [userMessage("policy?")], documentIds: [shipping] }),
			}),
		);
		const output = events.find((e) => e.type === "tool-output-available")?.output as {
			documentId: string;
		}[];
		expect(output.map((match) => match.documentId)).toEqual([shipping]);
		await waitFor(() => auditEvents.events.some((e) => e.action === "chat.message.answered"));
		expect(
			auditEvents.events.find((e) => e.action === "chat.message.answered")?.data,
		).toMatchObject({ scopedToDocumentIds: [shipping] });
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
				chunkerVersion: expect.stringContaining("text-v2"),
				usage: { inputTokens: 10, outputTokens: 5 },
			},
		});
	});

	test("regenerate answers the last question again, keeping the old reply as a version, and is audited as such", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: async () =>
				streamResult(textStreamParts(`Reply ${chatModel.doStreamCalls.length}`)),
		});
		const { app, conversations, auditEvents } = buildTestApp({ chatModel });
		const send = async (body: unknown) => {
			const response = await app.request("/api/v1/chat", {
				method: "POST",
				headers: await authHeaders(),
				body: JSON.stringify(body),
			});
			await readStream(response);
			return response;
		};
		const first = await send({ message: userMessage("What is the refund window?") });
		const conversationId = first.headers.get("x-conversation-id") ?? "";
		await waitFor(() => conversations.stored.length === 2);

		const again = await send({ conversationId, regenerate: true });
		expect(again.status).toBe(200);
		expect(again.headers.get("x-conversation-id")).toBe(conversationId);
		await waitFor(() =>
			conversations.stored.some((m) => JSON.stringify(m.message).includes("Reply 2")),
		);
		const stored = await conversations.messages("user-1", conversationId);
		expect(stored.map((m) => m.role)).toEqual(["user", "assistant"]);
		expect(JSON.stringify(stored[1]?.message)).toContain("Reply 2");
		// The old reply is kept as the first version.
		expect(await conversations.replyVersions("user-1", conversationId)).toEqual({
			current: 2,
			total: 2,
		});
		// The model saw the question again, not the old reply.
		const prompt = JSON.stringify(chatModel.doStreamCalls[1]?.prompt);
		expect(prompt).toContain("What is the refund window?");
		expect(prompt).not.toContain("Reply 1");
		await waitFor(
			() => auditEvents.events.filter((e) => e.action === "chat.message.answered").length === 2,
		);
		expect(
			auditEvents.events.findLast((e) => e.action === "chat.message.answered")?.data,
		).toMatchObject({
			regenerated: true,
		});
	});

	test("an earlier version of the reply can be put back, and the next turn builds on it", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: async () =>
				streamResult(textStreamParts(`Reply ${chatModel.doStreamCalls.length}`)),
		});
		const { app, conversations } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		const send = async (body: unknown) => {
			const response = await app.request("/api/v1/chat", {
				method: "POST",
				headers,
				body: JSON.stringify(body),
			});
			await readStream(response);
			return response;
		};
		const conversationId =
			(await send({ message: userMessage("Refund window?") })).headers.get("x-conversation-id") ??
			"";
		await waitFor(() => conversations.stored.length === 1 + 1);
		await send({ conversationId, regenerate: true });
		await waitFor(() => conversations.stored.length === 3);
		const restore = (version: number) =>
			app.request(`/api/v1/memory/conversations/${conversationId}/reply-version`, {
				method: "PUT",
				headers,
				body: JSON.stringify({ version }),
			});
		const get = async () =>
			(
				await (
					await app.request(`/api/v1/memory/conversations/${conversationId}`, { headers })
				).json()
			).data;

		expect((await get()).replyVersions).toEqual({ current: 2, total: 2 });
		const first = await restore(1);
		expect(first.status).toBe(200);
		expect((await first.json()).data).toEqual({ current: 1, total: 2 });
		const shown = await get();
		expect(shown.messages).toHaveLength(2);
		expect(JSON.stringify(shown.messages[1].message)).toContain("Reply 1");
		expect((await restore(3)).status).toBe(404);

		await send({ conversationId, message: userMessage("And for sale items?") });
		const prompt = JSON.stringify(chatModel.doStreamCalls[2]?.prompt);
		expect(prompt).toContain("Reply 1");
		expect(prompt).not.toContain("Reply 2");
		// A new question starts a new last reply: no versions to switch between yet.
		await waitFor(() => conversations.stored.length === 5);
		expect((await get()).replyVersions).toEqual({ current: 1, total: 1 });
	});

	test("a stopped answer is saved with what was written so far", async () => {
		let release: () => void = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		const chatModel = new MockLanguageModelV4({
			doStream: async ({ abortSignal }) => ({
				stream: new ReadableStream({
					async start(controller) {
						controller.enqueue({ type: "stream-start", warnings: [] });
						controller.enqueue({ type: "text-start", id: "t" });
						controller.enqueue({ type: "text-delta", id: "t", delta: "The refund window is " });
						release();
						// The model keeps going until the user stops it.
						await new Promise((resolve) => abortSignal?.addEventListener("abort", resolve));
						controller.error(abortSignal?.reason);
					},
				}),
			}),
		});
		const { app, conversations } = buildTestApp({ chatModel });
		const stop = new AbortController();
		const response = await app.request("/api/v1/chat", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ message: userMessage("Refund window?") }),
			signal: stop.signal,
		});
		const conversationId = response.headers.get("x-conversation-id") ?? "";
		const reader = response.body?.getReader();
		await held;
		// Stop once the browser has the first words, as a person pressing Stop would.
		const decoder = new TextDecoder();
		let received = "";
		while (reader && !received.includes("The refund window is")) {
			// oxlint-disable-next-line no-await-in-loop -- read until the text arrives
			const chunk = await reader.read();
			if (chunk.done) break;
			received += decoder.decode(chunk.value);
		}
		stop.abort();
		await reader?.cancel().catch(() => {});

		await waitFor(() => conversations.stored.length === 2);
		const [, reply] = await conversations.messages("user-1", conversationId);
		expect(reply?.role).toBe("assistant");
		expect(JSON.stringify(reply?.message)).toContain("The refund window is");
	});

	test("a conversation can be renamed by its owner only", async () => {
		const { app, conversations } = buildTestApp();
		const mine = await conversations.create("user-1", "Refund window?");
		const theirs = await conversations.create("user-2", "Theirs");
		const rename = async (id: string, title: unknown) =>
			app.request(`/api/v1/memory/conversations/${id}`, {
				method: "PATCH",
				headers: await authHeaders(),
				body: JSON.stringify({ title }),
			});
		const renamed = await rename(mine.id, "  Refunds  ");
		expect(renamed.status).toBe(200);
		expect((await renamed.json()).data.title).toBe("Refunds");
		expect((await rename(mine.id, "   ")).status).toBe(422);
		expect((await rename(theirs.id, "Mine now")).status).toBe(404);
		expect(theirs.title).toBe("Theirs");
	});

	test("regenerate needs a conversation of yours with a question in it", async () => {
		const { app } = buildTestApp();
		const post = async (body: unknown) =>
			(
				await app.request("/api/v1/chat", {
					method: "POST",
					headers: await authHeaders(),
					body: JSON.stringify(body),
				})
			).status;
		expect(await post({ regenerate: true })).toBe(422);
		expect(
			await post({
				regenerate: true,
				message: userMessage("x"),
				conversationId: crypto.randomUUID(),
			}),
		).toBe(422);
		expect(await post({ regenerate: true, conversationId: crypto.randomUUID() })).toBe(404);
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
		expect(streamedText(events)).toBe("Still answered");
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
