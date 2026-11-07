import type { EmbeddingGateway } from "@synapse/core/contracts";

import { type ChunkOptions, chunkText } from "../chunking/text-chunker";
import { chunkerVersion, embeddingVersion } from "../versioning/versions";
import { assertEmbeddingDimensions } from "./embedding-errors";

export type PreparedChunk = {
	chunkIndex: number;
	content: string;
	embedding: number[];
};

/** Chunks ready to store, with the versions that produced them. */
export type PreparedChunks = {
	chunks: PreparedChunk[];
	chunkerVersion: string;
	embeddingModel: string;
};

export type ChunkPreparerOptions = {
	embedding: EmbeddingGateway;
	chunking: ChunkOptions;
	/** Vector size the index stores (e.g. 1536). */
	dimensions: number;
};

/** chunk → embed (one batch) → check dimensions → attach versions. */
export function createChunkPreparer({ embedding, chunking, dimensions }: ChunkPreparerOptions) {
	const versions = {
		chunkerVersion: chunkerVersion(chunking),
		embeddingModel: embeddingVersion(embedding.info),
	};

	return {
		...versions,

		/** `null` when the content produces no chunks. */
		async prepare(content: string): Promise<PreparedChunks | null> {
			const pieces = chunkText(content, chunking);
			if (pieces.length === 0) {
				return null;
			}
			const vectors = await embedding.embedMany(pieces);
			for (const vector of vectors) {
				assertEmbeddingDimensions(vector, dimensions);
			}
			return {
				...versions,
				chunks: pieces.map((piece, chunkIndex) => ({
					chunkIndex,
					content: piece,
					embedding: vectors[chunkIndex] ?? [],
				})),
			};
		},

		/** Embed a query with the same model as the stored chunks. */
		async embedQuery(query: string): Promise<number[]> {
			const vector = await embedding.embed(query);
			assertEmbeddingDimensions(vector, dimensions);
			return vector;
		},
	};
}

export type ChunkPreparer = ReturnType<typeof createChunkPreparer>;
