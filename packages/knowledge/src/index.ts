export { type ChunkOptions, chunkText } from "./chunking/text-chunker";
export { assertEmbeddingDimensions, KNOWLEDGE_ERROR_CODES } from "./embeddings/embedding-errors";
export {
	type ChunkPreparer,
	type ChunkPreparerOptions,
	createChunkPreparer,
	type PreparedChunk,
	type PreparedChunks,
} from "./embeddings/prepare-chunks";
export { chunkerVersion, embeddingVersion, TEXT_CHUNKER_ALGORITHM } from "./versioning/versions";
