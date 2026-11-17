import { describe, expect, test } from "bun:test";
import type { EmbeddingGateway } from "@synapse/core/contracts";

import {
	chunkingOf,
	chunkText,
	createChunkPreparer,
	createRechunker,
	type RechunkCheckpoint,
	reassembleChunks,
} from "../src";

const DOC = [
	"# Returns and refunds",
	"",
	"Customers can return items within 30 days of delivery. ".repeat(12).trim(),
	"",
	"## Exceptions",
	"",
	"Gift cards, perishable goods and personalised items cannot be returned. ".repeat(10).trim(),
	"",
	"## How to return",
	"",
	"Print the label from your account and drop the parcel at any post office. ".repeat(9).trim(),
].join("\n");

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

describe("reassembleChunks", () => {
	test("rebuilds text-v1 chunks (headings included) without the repeated overlap", () => {
		for (const options of [
			{ size: 1000, overlap: 150 },
			{ size: 300, overlap: 60 },
			{ size: 200, overlap: 0 },
		]) {
			const chunks = chunkText(DOC, options);
			expect(chunks.length).toBeGreaterThan(1);
			expect(squash(reassembleChunks(chunks, options.overlap))).toBe(squash(DOC));
		}
	});

	test("empty chunks are skipped; one chunk is itself", () => {
		expect(reassembleChunks(["  ", "Only text.", ""], 150)).toBe("Only text.");
		expect(reassembleChunks([], 150)).toBe("");
	});

	test("chunkingOf reads size and overlap from a chunker version", () => {
		expect(chunkingOf("text-v1;size=1000;overlap=150")).toEqual({ size: 1000, overlap: 150 });
		expect(chunkingOf(null)).toBeNull();
	});
});

const embedding: EmbeddingGateway = {
	info: { provider: "fake", model: "e" },
	embed: async () => [1, 0, 0],
	embedMany: async (values) => values.map(() => [1, 0, 0]),
};

describe("createRechunker", () => {
	test("re-chunks old documents with headings as context, checkpoints per document, resumes", async () => {
		const old = chunkText(DOC, { size: 300, overlap: 60 }).map((content) => ({
			content,
			chunkerVersion: "text-v1;size=300;overlap=60",
		}));
		const stored = new Map([
			["d1", old],
			["d2", old],
		]);
		const replaced: Array<{ id: string; contexts: string[]; version: string }> = [];
		let checkpoint = null as RechunkCheckpoint | null;
		let failOnce = "d2";
		const ports = {
			staleDocuments: async ({ afterDocumentId }: { afterDocumentId: string | null }) =>
				[...stored.keys()]
					.filter((id) => (afterDocumentId ? id > afterDocumentId : true))
					.filter((id) => stored.get(id)?.[0]?.chunkerVersion?.startsWith("text-v1"))
					.map((id) => ({ id, title: "Store policy" })),
			chunksOf: async (id: string) => stored.get(id) ?? [],
			replaceChunks: async (
				id: string,
				prepared: { chunks: Array<{ content: string; context: string }>; chunkerVersion: string },
			) => {
				if (id === failOnce) {
					failOnce = "";
					throw new Error("crash");
				}
				stored.set(
					id,
					prepared.chunks.map((chunk) => ({
						content: chunk.content,
						chunkerVersion: prepared.chunkerVersion,
					})),
				);
				replaced.push({
					id,
					contexts: prepared.chunks.map((chunk) => chunk.context),
					version: prepared.chunkerVersion,
				});
			},
			loadCheckpoint: async () => checkpoint,
			saveCheckpoint: async (next: RechunkCheckpoint) => {
				checkpoint = next;
			},
		};
		const preparer = createChunkPreparer({
			embedding,
			chunking: { size: 1000, overlap: 150 },
			dimensions: 3,
		});
		const rechunker = createRechunker({ preparer, ports, defaultOverlap: 150 });

		await expect(rechunker.run()).rejects.toThrow("crash");
		expect(checkpoint).toEqual({ afterDocumentId: "d1", rechunked: 1 });
		const result = await rechunker.run();
		expect(result).toEqual({ rechunked: 2, chunkerVersion: "text-v2;size=1000;overlap=150" });
		expect(replaced.map((entry) => entry.id)).toEqual(["d1", "d2"]);
		expect(replaced[0]?.contexts).toContain("Store policy › Returns and refunds › Exceptions");
		expect(replaced[0]?.contexts).toContain("Store policy › Returns and refunds › How to return");

		// Nothing left to do.
		checkpoint = null;
		expect((await rechunker.run()).rechunked).toBe(0);
	});
});
