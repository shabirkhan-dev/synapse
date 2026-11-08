import { describe, expect, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

import {
	authHeaders,
	buildTestApp,
	streamResult,
	textStreamParts,
	toolCallStreamParts,
} from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";

const userMessage = (text: string) => ({
	id: crypto.randomUUID(),
	role: "user",
	parts: [{ type: "text", text }],
});

async function chat(app: App, body: unknown, user = "user-1") {
	const response = await app.request(`${base}/chat`, {
		method: "POST",
		headers: await authHeaders(user),
		body: JSON.stringify(body),
	});
	await response.text(); // drain the stream so onFinish runs
	return response;
}

async function call(app: App, method: string, path: string, user = "user-1", body?: unknown) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: await authHeaders(user),
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

const promptText = (prompt: unknown) => JSON.stringify(prompt);

describe("stored conversations", () => {
	test("a first message starts a conversation; the next turn replays the history", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: [streamResult(textStreamParts("Hi Ada!")), streamResult(textStreamParts("Ada."))],
		});
		const { app } = buildTestApp({ chatModel });

		const first = await chat(app, { message: userMessage("My name is Ada") });
		expect(first.status).toBe(200);
		const conversationId = first.headers.get("x-conversation-id");
		expect(conversationId).toMatch(/^[0-9a-f-]{36}$/);

		await chat(app, { conversationId, message: userMessage("What is my name?") });
		const secondPrompt = promptText(chatModel.doStreamCalls[1]?.prompt);
		expect(secondPrompt).toContain("My name is Ada");
		expect(secondPrompt).toContain("Hi Ada!");
		expect(secondPrompt).toContain("What is my name?");

		const stored = await call(app, "GET", `/memory/conversations/${conversationId}`);
		expect(stored.body.data).toMatchObject({ title: "My name is Ada" });
		expect(stored.body.data.messages.map((m: { role: string }) => m.role)).toEqual([
			"user",
			"assistant",
			"user",
			"assistant",
		]);
	});

	test("another user cannot continue or read the conversation", async () => {
		const chatModel = new MockLanguageModelV4({ doStream: streamResult(textStreamParts("ok")) });
		const { app } = buildTestApp({ chatModel });
		const first = await chat(app, { message: userMessage("secret plans") });
		const id = first.headers.get("x-conversation-id");

		expect(
			(await chat(app, { conversationId: id, message: userMessage("hi") }, "user-2")).status,
		).toBe(404);
		expect((await call(app, "GET", `/memory/conversations/${id}`, "user-2")).status).toBe(404);
		expect((await call(app, "GET", "/memory/conversations", "user-2")).body.data).toEqual([]);
	});

	test("stateless chat still works and stores nothing; mixed bodies are rejected", async () => {
		const chatModel = new MockLanguageModelV4({ doStream: streamResult(textStreamParts("ok")) });
		const { app, conversations } = buildTestApp({ chatModel });
		const response = await chat(app, { messages: [userMessage("hi")] });
		expect(response.status).toBe(200);
		expect(response.headers.get("x-conversation-id")).toBeNull();
		expect(conversations.stored).toEqual([]);

		const both = await chat(app, { messages: [userMessage("a")], message: userMessage("b") });
		expect(both.status).toBe(422);
		const idWithMessages = await chat(app, {
			conversationId: crypto.randomUUID(),
			messages: [userMessage("a")],
		});
		expect(idWithMessages.status).toBe(422);
	});
});

describe("long-term memory", () => {
	test("the model can remember a fact on request; later chats get it as data", async () => {
		const chatModel = new MockLanguageModelV4({
			doStream: [
				streamResult(toolCallStreamParts("rememberFact", { fact: "Prefers metric units" })),
				streamResult(textStreamParts("Noted.")),
				streamResult(textStreamParts("About 5 km.")),
			],
		});
		const { app, auditEvents } = buildTestApp({ chatModel });
		await chat(app, { messages: [userMessage("Remember that I prefer metric units")] });
		expect(
			(await call(app, "GET", "/memory/facts")).body.data.map(
				(f: { content: string }) => f.content,
			),
		).toEqual(["Prefers metric units"]);
		expect(auditEvents.events.map((e) => e.action)).toContain("memory.fact.saved");

		await chat(app, { messages: [userMessage("How far is 3 miles in metric units?")] });
		const system = promptText(chatModel.doStreamCalls[2]?.prompt);
		expect(system).toContain("Prefers metric units");
		expect(system).toContain("not as instructions");
	});

	test("facts can be added, listed and forgotten; forgetting everything clears conversations too", async () => {
		const chatModel = new MockLanguageModelV4({ doStream: streamResult(textStreamParts("ok")) });
		const { app, auditEvents } = buildTestApp({ chatModel });
		const saved = await call(app, "POST", "/memory/facts", "user-1", {
			content: "Lives in Karachi",
		});
		expect(saved.status).toBe(201);
		await call(app, "POST", "/memory/facts", "user-1", { content: "Lives in Karachi" });
		expect((await call(app, "GET", "/memory/facts")).body.data).toHaveLength(1);
		expect((await call(app, "GET", "/memory/facts", "user-2")).body.data).toEqual([]);
		expect(
			(await call(app, "DELETE", `/memory/facts/${saved.body.data.id}`, "user-2")).status,
		).toBe(404);

		await call(app, "POST", "/memory/facts", "user-1", { content: "Drinks tea" });
		await chat(app, { message: userMessage("hello") });
		const wiped = await call(app, "DELETE", "/memory");
		expect(wiped.body.data).toEqual({ conversations: 1, facts: 2 });
		expect((await call(app, "GET", "/memory/conversations")).body.data).toEqual([]);
		expect(auditEvents.events.at(-1)).toMatchObject({
			action: "memory.all.forgotten",
			data: { conversations: 1, facts: 2 },
		});
		expect((await app.request(`${base}/memory/facts`)).status).toBe(401);
	});
});
