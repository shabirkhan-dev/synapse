import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { type Account, call, signUp } from "../support/client";
import { SYSTEM } from "../support/env";
import { type Stack, startStack } from "../support/stack";

let stack: Stack;
let ada: Account;

const CIRCUIT_RESET_MS = 2_000;

beforeAll(async () => {
	stack = await startStack({
		AI_CHAT_TIMEOUT_MS: "1000",
		AI_EMBEDDING_TIMEOUT_MS: "1000",
		AI_RETRY_ATTEMPTS: "2",
		AI_CIRCUIT_FAILURE_THRESHOLD: "3",
		AI_CIRCUIT_RESET_MS: String(CIRCUIT_RESET_MS),
	});
	ada = await signUp("chaos-model");
	const seeded = await call("/rag/documents", {
		method: "POST",
		token: ada.accessToken,
		body: { title: "Refunds", content: "Refunds are accepted within 30 days of purchase." },
	});
	expect(seeded.status).toBe(201);
});

afterAll(async () => {
	await stack?.modelFault({});
	await stack?.stop();
});

const ask = () =>
	call("/rag/query", { method: "POST", token: ada.accessToken, body: { query: "refunds?" } });

/** Heal the model and wait out an open circuit, so each test starts from a working provider. */
async function heal(): Promise<void> {
	await stack.modelFault({});
	await Bun.sleep(CIRCUIT_RESET_MS + 200);
}

describe("the model provider misbehaves", () => {
	test("a slow model gives 504 within the deadline, not a hang", async () => {
		await stack.modelFault({ delayMs: 3_000 });
		const started = performance.now();
		const reply = await ask();
		expect(reply.status).toBe(504);
		expect(reply.body.error?.code).toBe("RELIABILITY_TIMEOUT");
		// Two 1 s attempts plus backoff, well short of the model's 3 s.
		expect(performance.now() - started).toBeLessThan(3_000);
		await heal();
		expect((await ask()).status).toBe(200);
	});

	test("a failing model opens the circuit, which closes again after the reset", async () => {
		await stack.modelFault({ status: 500 });
		const statuses: number[] = [];
		for (let attempt = 0; attempt < 5 && !statuses.includes(503); attempt++) {
			// oxlint-disable-next-line no-await-in-loop -- failures must accumulate in order
			const reply = await ask();
			statuses.push(reply.status);
			if (reply.status === 503) expect(reply.body.error?.code).toBe("RELIABILITY_CIRCUIT_OPEN");
		}
		expect(statuses).toContain(503);
		// The System page reads the same breaker state (a query is embedded first, so that circuit opens).
		const system = await call<{ circuits: { name: string; state: string }[] }>("/system/status", {
			token: ada.accessToken,
		});
		const embeddings = system.body.data.circuits.find((circuit) => circuit.name === "embeddings");
		expect(embeddings?.state).toBe("open");

		await stack.modelFault({});
		expect((await ask()).status).toBe(503);
		await Bun.sleep(CIRCUIT_RESET_MS + 200);
		expect((await ask()).status).toBe(200);
	});

	test("keyword search keeps working while the model is down", async () => {
		await heal();
		await stack.modelFault({ status: 500 });
		const reply = await call<{ matches: unknown[] }>("/rag/query", {
			method: "POST",
			token: ada.accessToken,
			body: { query: "refunds", answer: false, mode: "keyword" },
		});
		expect(reply.status).toBe(200);
		expect(reply.body.data.matches.length).toBeGreaterThan(0);
	});

	test("a failed ingest leaves no half-stored document", async () => {
		await heal();
		await stack.modelFault({ status: 500 });
		const title = `Broken ${Date.now()}`;
		const reply = await call("/rag/documents", {
			method: "POST",
			token: ada.accessToken,
			body: { title, content: "This document cannot be embedded right now." },
		});
		expect(reply.status).toBeGreaterThanOrEqual(500);
		await stack.modelFault({});
		const list = await call<{ title: string }[]>("/rag/documents", { token: ada.accessToken });
		expect(list.body.data.map((document) => document.title)).not.toContain(title);
	});

	test("streaming chat ends with an error instead of hanging", async () => {
		await heal();
		// Embeddings (memory recall) work; the streamed chat call itself fails.
		await stack.modelFault({ status: 500, only: "chat" });
		const started = performance.now();
		const response = await fetch(`${SYSTEM.apiUrl}/chat`, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${ada.accessToken}` },
			body: JSON.stringify({
				message: { id: "m1", role: "user", parts: [{ type: "text", text: "refunds?" }] },
			}),
		});
		const text = await response.text();
		expect(performance.now() - started).toBeLessThan(20_000);
		expect(text).toContain('"type":"error"');
	}, 30_000);
});
