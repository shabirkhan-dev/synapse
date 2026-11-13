import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createAccessTokens } from "@synapse/security";

import { type Account, call, signUp } from "../support/client";
import { SYSTEM } from "../support/env";
import { type Stack, startStack } from "../support/stack";

/** Two accounts in separate organizations: nothing of Ada's may reach Bob. */
let stack: Stack;
let ada: Account;
let bob: Account;
let documentId: string;
let conversationId: string;
const SECRET_TEXT = "The vault code for project heliotrope is 4417.";

beforeAll(async () => {
	stack = await startStack();
	[ada, bob] = await Promise.all([signUp("ada"), signUp("bob")]);
	const ingested = await call<{ id: string }>("/rag/documents", {
		method: "POST",
		token: ada.accessToken,
		body: { title: "Heliotrope", content: SECRET_TEXT },
	});
	expect(ingested.status).toBe(201);
	documentId = ingested.body.data.id;
	const fact = await call("/memory/facts", {
		method: "POST",
		token: ada.accessToken,
		body: { content: "I like heliotrope" },
	});
	expect(fact.status).toBe(201);

	const chat = await fetch(`${SYSTEM.apiUrl}/chat`, {
		method: "POST",
		headers: { "content-type": "application/json", authorization: `Bearer ${ada.accessToken}` },
		body: JSON.stringify({
			message: { id: "m1", role: "user", parts: [{ type: "text", text: "vault code?" }] },
		}),
	});
	conversationId = chat.headers.get("x-conversation-id") ?? "";
	await chat.text();
	expect(conversationId).not.toBe("");
});

afterAll(() => stack?.stop());

describe("tenant isolation", () => {
	test("another tenant cannot read, list, search or delete a document", async () => {
		expect((await call(`/rag/documents/${documentId}`, { token: bob.accessToken })).status).toBe(
			404,
		);
		const list = await call<{ id: string }[]>("/rag/documents", { token: bob.accessToken });
		expect(list.body.data.map((document) => document.id)).not.toContain(documentId);
		for (const mode of ["hybrid", "vector", "keyword"]) {
			// oxlint-disable-next-line no-await-in-loop -- one mode at a time keeps failures readable
			const search = await call<{ matches: { documentId: string }[] }>("/rag/query", {
				method: "POST",
				token: bob.accessToken,
				body: { query: SECRET_TEXT, answer: false, mode },
			});
			expect(search.status).toBe(200);
			expect(search.body.data.matches.map((match) => match.documentId)).not.toContain(documentId);
		}
		const deleted = await call(`/rag/documents/${documentId}`, {
			method: "DELETE",
			token: bob.accessToken,
		});
		expect(deleted.status).toBe(404);
		expect((await call(`/rag/documents/${documentId}`, { token: ada.accessToken })).status).toBe(
			200,
		);
	});

	test("another user cannot read or delete a conversation or see facts", async () => {
		const path = `/memory/conversations/${conversationId}`;
		expect((await call(path, { token: bob.accessToken })).status).toBe(404);
		expect((await call(path, { method: "DELETE", token: bob.accessToken })).status).toBe(404);
		expect((await call(path, { token: ada.accessToken })).status).toBe(200);
		const facts = await call<{ content: string }[]>("/memory/facts", { token: bob.accessToken });
		expect(facts.body.data).toEqual([]);
	});

	test("a non-member cannot see or join another organization", async () => {
		const members = `/organizations/${ada.userId}/members`;
		expect([403, 404]).toContain((await call(members, { token: bob.accessToken })).status);
		const join = await call(members, {
			method: "POST",
			token: bob.accessToken,
			body: { email: bob.email, role: "owner" },
		});
		expect([403, 404]).toContain(join.status);
		const switched = await call("/auth/switch-organization", {
			method: "POST",
			token: bob.accessToken,
			body: { organizationId: ada.userId },
		});
		expect([403, 404]).toContain(switched.status);
	});

	test("a correctly signed token naming someone else's organization is refused", async () => {
		const tokens = createAccessTokens({ secret: SYSTEM.jwtSecret, ttlSeconds: 300 });
		const me = await call<{ id: string }>("/auth/me", { token: bob.accessToken });
		const sessions = await call<{ id: string }[]>("/auth/sessions", { token: bob.accessToken });
		const { token } = await tokens.issue({
			sub: me.body.data.id,
			sid: sessions.body.data[0]?.id ?? "",
			org: ada.userId,
		});
		const reply = await call("/rag/documents", { token });
		expect(reply.status).toBe(401);
		expect(reply.body.error?.code).toBe("AUTH_NOT_A_MEMBER");
	});
});
