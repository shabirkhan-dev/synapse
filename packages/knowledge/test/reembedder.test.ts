import { describe, expect, test } from "bun:test";

import type { EmbeddingGateway } from "@synapse/core/contracts";

import { createReembedder, type ReembedCheckpoint, type ReembedPorts } from "../src";

type Row = { id: string; content: string; model: string | null; embedding: number[] };

function memoryPorts(rows: Row[]) {
	let saved: ReembedCheckpoint | null = null;
	const ports: ReembedPorts = {
		async staleChunks({ embeddingModel, afterChunkId, limit }) {
			return rows
				.filter((row) => row.model !== embeddingModel && (!afterChunkId || row.id > afterChunkId))
				.toSorted((a, b) => a.id.localeCompare(b.id))
				.slice(0, limit)
				.map(({ id, content }) => ({ id, content }));
		},
		async saveEmbeddings({ embeddingModel, vectors }) {
			for (const { id, embedding } of vectors) {
				const row = rows.find((r) => r.id === id);
				if (row) Object.assign(row, { model: embeddingModel, embedding });
			}
		},
		async loadCheckpoint() {
			return saved;
		},
		async saveCheckpoint(checkpoint) {
			saved = checkpoint;
		},
	};
	return { ports, checkpoint: () => saved };
}

function gateway(failOnCall?: number): EmbeddingGateway & { calls: number } {
	const g = {
		calls: 0,
		info: { provider: "test", model: "embed-2" },
		embed: async () => [1, 0],
		embedMany: async (values: string[]) => {
			g.calls += 1;
			if (g.calls === failOnCall) throw new Error("provider timeout");
			return values.map(() => [1, 0]);
		},
	};
	return g;
}

const rows = (): Row[] =>
	["a", "b", "c", "d", "e"].map((id) => ({
		id,
		content: `chunk ${id}`,
		model: "test:embed-1",
		embedding: [0, 1],
	}));

describe("reembedder", () => {
	test("re-embeds stale chunks in batches and checkpoints each one", async () => {
		const data = [
			...rows(),
			{ id: "f", content: "fresh", model: "test:embed-2", embedding: [1, 0] },
		];
		const { ports, checkpoint } = memoryPorts(data);
		const embedding = gateway();
		const result = await createReembedder({ embedding, ports, dimensions: 2, batchSize: 2 }).run();
		expect(result).toEqual({ embeddingModel: "test:embed-2", reembedded: 5 });
		expect(embedding.calls).toBe(3);
		expect(data.every((row) => row.model === "test:embed-2")).toBe(true);
		expect(checkpoint()).toEqual({ afterChunkId: "e", reembedded: 5 });
	});

	test("a crash mid-run resumes after the last checkpoint", async () => {
		const data = rows();
		const { ports, checkpoint } = memoryPorts(data);
		const crashing = gateway(2);
		const failed = createReembedder({ embedding: crashing, ports, dimensions: 2, batchSize: 2 });
		await expect(failed.run()).rejects.toThrow("provider timeout");
		expect(checkpoint()).toEqual({ afterChunkId: "b", reembedded: 2 });

		const retry = gateway();
		const result = await createReembedder({
			embedding: retry,
			ports,
			dimensions: 2,
			batchSize: 2,
		}).run();
		expect(result.reembedded).toBe(5);
		expect(retry.calls).toBe(2);
	});

	test("rejects vectors of the wrong size before writing anything", async () => {
		const data = rows();
		const { ports } = memoryPorts(data);
		const reembedder = createReembedder({
			embedding: gateway(),
			ports,
			dimensions: 3,
			batchSize: 10,
		});
		await expect(reembedder.run()).rejects.toMatchObject({
			code: "KNOWLEDGE_EMBEDDING_DIMENSION_MISMATCH",
		});
		expect(data.every((row) => row.model === "test:embed-1")).toBe(true);
	});
});
