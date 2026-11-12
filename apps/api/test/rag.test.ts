import { describe, expect, test } from "bun:test";
import { MockEmbeddingModelV4, MockLanguageModelV4 } from "ai/test";

import { authHeaders, buildTestApp, InMemoryRagRepository, textGenerateResult } from "./helpers";

const refundDoc = {
	title: "Refund policy",
	source: "https://example.com/refunds",
	content: [
		"Customers can request a refund within 30 days of purchase by contacting support.",
		"Shipping costs are not refundable unless the item arrived damaged.",
		"",
		"Our office cat is named Biscuit and enjoys sleeping on the printer.",
	].join("\n"),
};

async function searchBiscuit(searchMode: "vector" | "hybrid") {
	const { app } = buildTestApp({ searchMode });
	await app.request("/api/v1/rag/documents", {
		method: "POST",
		headers: await authHeaders(),
		body: JSON.stringify(refundDoc),
	});
	const response = await app.request("/api/v1/rag/query", {
		method: "POST",
		headers: await authHeaders(),
		body: JSON.stringify({ query: "Biscuit printer", answer: false, topK: 2 }),
	});
	return (await response.json()).data.matches;
}

describe("rag", () => {
	test("ingest chunks, embeds and stores a document", async () => {
		const repository = new InMemoryRagRepository();
		const { app, embeddingModel } = buildTestApp({ repository });
		const response = await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify(refundDoc),
		});
		expect(response.status).toBe(201);
		const { data, message, statusCode } = await response.json();
		expect(message).toBe("Document ingested");
		expect(statusCode).toBe(201);
		expect(data).toMatchObject({ title: "Refund policy", source: refundDoc.source });
		expect(data.chunkCount).toBeGreaterThan(1);
		expect(repository.chunks).toHaveLength(data.chunkCount);
		expect(repository.chunks.every((chunk) => chunk.embedding.length === 1536)).toBe(true);
		expect(repository.chunks[0]).toMatchObject({
			chunkerVersion: "text-v1;size=200;overlap=20",
			embeddingModel: "mock:mock-embedding",
		});
		expect(embeddingModel.doEmbedCalls).toHaveLength(1);
	});

	test("validates the ingest body", async () => {
		const { app } = buildTestApp();
		const response = await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify({ title: "", content: "x" }),
		});
		expect(response.status).toBe(422);
		const body = await response.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
		expect(body.message).toBe("Request validation failed");
		expect(body.error.details[0].path).toBe("title");
	});

	test("query returns the closest chunks first and an answer from the chat model", async () => {
		const chatModel = new MockLanguageModelV4({
			doGenerate: textGenerateResult("You have 30 days [1]."),
		});
		const { app } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers,
			body: JSON.stringify(refundDoc),
		});

		const response = await app.request("/api/v1/rag/query", {
			method: "POST",
			headers,
			body: JSON.stringify({ query: "how many days to request a refund", topK: 2 }),
		});
		expect(response.status).toBe(200);
		const { data } = await response.json();
		expect(data.answer).toBe("You have 30 days [1].");
		expect(data.matches).toHaveLength(2);
		expect(data.matches[0].content).toContain("30 days");
		expect(data.matches[0].score).toBeGreaterThanOrEqual(data.matches[1].score);
		expect(data.citations).toEqual([
			{
				index: 1,
				chunkId: data.matches[0].chunkId,
				documentId: data.matches[0].documentId,
				title: "Refund policy",
				source: refundDoc.source,
			},
		]);
		expect(data.provenance).toEqual({
			chatModel: "mock:mock-chat",
			promptVersion: "rag-answer@2",
			embeddingModel: "mock:mock-embedding",
			chunkerVersion: "text-v1;size=200;overlap=20",
			usage: { inputTokens: 10, outputTokens: 5 },
		});

		const prompt = JSON.stringify(chatModel.doGenerateCalls[0]?.prompt);
		expect(prompt).toContain("[1] Refund policy");
		expect(prompt).toContain("how many days to request a refund");
	});

	test("an answer that cites nothing is retried once with the stricter prompt", async () => {
		const replies = ["You have 30 days.", "You have 30 days [1]."];
		const chatModel = new MockLanguageModelV4({
			doGenerate: async () => textGenerateResult(replies.shift() ?? "unexpected third call"),
		});
		const { app } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers,
			body: JSON.stringify(refundDoc),
		});

		const response = await app.request("/api/v1/rag/query", {
			method: "POST",
			headers,
			body: JSON.stringify({ query: "how many days to request a refund" }),
		});
		const { data } = await response.json();
		expect(chatModel.doGenerateCalls).toHaveLength(2);
		expect(JSON.stringify(chatModel.doGenerateCalls[1]?.prompt)).toContain(
			"An answer without passage numbers is not allowed.",
		);
		expect(data.answer).toBe("You have 30 days [1].");
		expect(data.citations).toHaveLength(1);
		// Provenance names the prompt that produced the returned answer.
		expect(data.provenance.promptVersion).toBe("rag-answer-cited@2");
	});

	test("an answer that still cites nothing after the retry is returned as is", async () => {
		const chatModel = new MockLanguageModelV4({
			doGenerate: textGenerateResult("I do not know."),
		});
		const { app } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers,
			body: JSON.stringify(refundDoc),
		});
		const response = await app.request("/api/v1/rag/query", {
			method: "POST",
			headers,
			body: JSON.stringify({ query: "what is the office wifi password" }),
		});
		const { data } = await response.json();
		expect(chatModel.doGenerateCalls).toHaveLength(2);
		expect(data).toMatchObject({ answer: "I do not know.", citations: [] });
	});

	test("answer=false skips the chat model", async () => {
		const chatModel = new MockLanguageModelV4({ doGenerate: textGenerateResult("unused") });
		const { app } = buildTestApp({ chatModel });
		const headers = await authHeaders();
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers,
			body: JSON.stringify(refundDoc),
		});
		const response = await app.request("/api/v1/rag/query", {
			method: "POST",
			headers,
			body: JSON.stringify({ query: "office cat", answer: false }),
		});
		const { data } = await response.json();
		expect(data.answer).toBeNull();
		expect(data.citations).toEqual([]);
		expect(data.provenance).toBeNull();
		expect(data.matches[0].content).toContain("Biscuit");
		expect(chatModel.doGenerateCalls).toHaveLength(0);
	});

	test("documents are scoped to their owner", async () => {
		const { app } = buildTestApp();
		await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers: await authHeaders("alice"),
			body: JSON.stringify(refundDoc),
		});
		const bob = await authHeaders("bob");
		const list = await (await app.request("/api/v1/rag/documents", { headers: bob })).json();
		expect(list.data).toEqual([]);
		const query = await (
			await app.request("/api/v1/rag/query", {
				method: "POST",
				headers: bob,
				body: JSON.stringify({ query: "refund", answer: true }),
			})
		).json();
		expect(query.data.matches).toEqual([]);
		expect(query.data.answer).toContain("could not find");
	});

	test("a document's detail lists its chunks in order with their versions, paged and owner-scoped", async () => {
		const repository = new InMemoryRagRepository();
		const { app } = buildTestApp({ repository });
		const headers = await authHeaders("alice");
		const created = await (
			await app.request("/api/v1/rag/documents", {
				method: "POST",
				headers,
				body: JSON.stringify(refundDoc),
			})
		).json();
		const id = created.data.id as string;
		const total = created.data.chunkCount as number;
		expect(total).toBeGreaterThan(1);

		const response = await app.request(`/api/v1/rag/documents/${id}`, { headers });
		expect(response.status).toBe(200);
		const { data } = await response.json();
		expect(data).toMatchObject({ id, title: "Refund policy", page: { offset: 0, total } });
		expect(data.chunks.map((chunk: { chunkIndex: number }) => chunk.chunkIndex)).toEqual(
			Array.from({ length: total }, (_, index) => index),
		);
		expect(data.chunks[0]).not.toHaveProperty("embedding");
		expect(data.chunks[0].embeddingModel).toBe(data.current.embeddingModel);
		expect(data.chunks[0].chunkerVersion).toBe(data.current.chunkerVersion);

		const second = await (
			await app.request(`/api/v1/rag/documents/${id}?offset=1&limit=1`, { headers })
		).json();
		expect(second.data.chunks).toHaveLength(1);
		expect(second.data.chunks[0].chunkIndex).toBe(1);
		expect(second.data.page).toEqual({ offset: 1, limit: 1, total });

		// Another tenant, an unknown id and a malformed one.
		const bob = await authHeaders("bob");
		expect((await app.request(`/api/v1/rag/documents/${id}`, { headers: bob })).status).toBe(404);
		const unknown = await app.request(`/api/v1/rag/documents/${crypto.randomUUID()}`, { headers });
		expect((await unknown.json()).error.code).toBe("RAG_DOCUMENT_NOT_FOUND");
		expect((await app.request("/api/v1/rag/documents/not-a-uuid", { headers })).status).toBe(422);
		expect((await app.request(`/api/v1/rag/documents/${id}?limit=500`, { headers })).status).toBe(
			422,
		);
	});

	test("delete removes a document and 404s for unknown ids", async () => {
		const { app, repository } = buildTestApp();
		const headers = await authHeaders();
		const created = await (
			await app.request("/api/v1/rag/documents", {
				method: "POST",
				headers,
				body: JSON.stringify(refundDoc),
			})
		).json();
		const id = created.data.id;
		expect(
			(await app.request(`/api/v1/rag/documents/${id}`, { method: "DELETE", headers })).status,
		).toBe(200);
		expect((repository as InMemoryRagRepository).chunks).toHaveLength(0);
		const again = await app.request(`/api/v1/rag/documents/${id}`, { method: "DELETE", headers });
		expect(again.status).toBe(404);
		expect((await again.json()).error.code).toBe("RAG_DOCUMENT_NOT_FOUND");
	});

	test("fails clearly when the embedding model returns the wrong dimensions", async () => {
		const embeddingModel = new MockEmbeddingModelV4({
			doEmbed: async ({ values }) => ({ embeddings: values.map(() => [0.1, 0.2]), warnings: [] }),
		});
		const { app } = buildTestApp({ embeddingModel });
		const response = await app.request("/api/v1/rag/documents", {
			method: "POST",
			headers: await authHeaders(),
			body: JSON.stringify(refundDoc),
		});
		expect(response.status).toBe(502);
		expect((await response.json()).error.code).toBe("RAG_EMBEDDING_DIMENSION_MISMATCH");
	});

	test("re-ingesting the same content returns the existing document without re-embedding", async () => {
		const { app, embeddingModel } = buildTestApp();
		const ingest = async (content: string, sub = "user-1") =>
			app.request("/api/v1/rag/documents", {
				method: "POST",
				headers: await authHeaders(sub),
				body: JSON.stringify({ ...refundDoc, content }),
			});

		const first = await ingest(refundDoc.content);
		expect(first.status).toBe(201);
		const created = (await first.json()).data;
		expect(created.contentHash).toMatch(/^[0-9a-f]{64}$/);

		// Same content with different line endings and trailing whitespace is a duplicate.
		const again = await ingest(`${refundDoc.content.replaceAll("\n", "\r\n")}  \n\n`);
		expect(again.status).toBe(200);
		const body = await again.json();
		expect(body.message).toBe("Document already ingested");
		expect(body.data.id).toBe(created.id);
		expect(embeddingModel.doEmbedCalls).toHaveLength(1);

		// Dedup is per owner: another user gets their own document.
		const other = await ingest(refundDoc.content, "user-2");
		expect(other.status).toBe(201);
		expect((await other.json()).data.id).not.toBe(created.id);
	});

	test("hybrid search (default) fuses vector and keyword ranks; vector mode keeps cosine scores", async () => {
		const hybrid = await searchBiscuit("hybrid");
		expect(hybrid[0].content).toContain("Biscuit");
		expect(hybrid[0].ranks).toEqual({ vector: 1, keyword: 1 });
		expect(hybrid[0].score).toBeCloseTo(2 / 61, 10);

		const vector = await searchBiscuit("vector");
		expect(vector[0].ranks).toEqual({ vector: 1 });
		expect(vector[0].score).toBeGreaterThan(0.1);
	});
});
