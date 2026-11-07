import { describe, expect, test } from "bun:test";

import type { EmbeddingGateway } from "@synapse/core/contracts";
import { isSynapseError } from "@synapse/core/errors";

import {
	chunkerVersion,
	createChunkPreparer,
	embeddingVersion,
	KNOWLEDGE_ERROR_CODES,
} from "../src";

function fakeEmbedding(dimensions: number): EmbeddingGateway & { calls: string[][] } {
	const calls: string[][] = [];
	return {
		calls,
		info: { provider: "test", model: "embed-1" },
		async embed(value) {
			calls.push([value]);
			return Array.from({ length: dimensions }, () => value.length);
		},
		async embedMany(values) {
			calls.push(values);
			return values.map((value) => Array.from({ length: dimensions }, () => value.length));
		},
	};
}

const chunking = { size: 40, overlap: 0 };

describe("versions", () => {
	test("are stable strings derived from settings and model", () => {
		expect(chunkerVersion({ size: 1000, overlap: 150 })).toBe("text-v1;size=1000;overlap=150");
		expect(embeddingVersion({ provider: "openrouter", model: "x/y" })).toBe("openrouter:x/y");
	});
});

describe("chunk preparer", () => {
	test("chunks, embeds in one batch and attaches versions", async () => {
		const embedding = fakeEmbedding(3);
		const preparer = createChunkPreparer({ embedding, chunking, dimensions: 3 });
		const prepared = await preparer.prepare(
			"First paragraph is here.\n\nSecond paragraph is here.",
		);
		expect(prepared?.chunks.map((c) => c.content)).toEqual([
			"First paragraph is here.",
			"Second paragraph is here.",
		]);
		expect(prepared?.chunks[1]).toMatchObject({ chunkIndex: 1, embedding: [25, 25, 25] });
		expect(prepared?.chunkerVersion).toBe("text-v1;size=40;overlap=0");
		expect(prepared?.embeddingModel).toBe("test:embed-1");
		expect(embedding.calls).toHaveLength(1);
	});

	test("returns null for content without chunks", async () => {
		const embedding = fakeEmbedding(3);
		const preparer = createChunkPreparer({ embedding, chunking, dimensions: 3 });
		expect(await preparer.prepare("   ")).toBeNull();
		expect(embedding.calls).toHaveLength(0);
	});

	test("rejects vectors with the wrong dimensions", async () => {
		const preparer = createChunkPreparer({ embedding: fakeEmbedding(2), chunking, dimensions: 3 });
		const error = await preparer.prepare("hello").catch((caught: unknown) => caught);
		expect(isSynapseError(error) && error.code).toBe(
			KNOWLEDGE_ERROR_CODES.EMBEDDING_DIMENSION_MISMATCH,
		);
		expect(await preparer.embedQuery("hi").catch((caught: unknown) => isSynapseError(caught))).toBe(
			true,
		);
	});
});
