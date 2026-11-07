import type { ModelInfo } from "@synapse/core/contracts";

import type { ChunkOptions } from "../chunking/text-chunker";

/** Bump when the chunking algorithm changes in a way that produces different chunks. */
export const TEXT_CHUNKER_ALGORITHM = "text-v1";

/** e.g. `text-v1;size=1000;overlap=150` — same string ⇒ same chunks for the same content. */
export function chunkerVersion({ size, overlap }: ChunkOptions): string {
	return `${TEXT_CHUNKER_ALGORITHM};size=${size};overlap=${overlap}`;
}

/** e.g. `openrouter:openai/text-embedding-3-small`. Never mix vectors of different versions. */
export function embeddingVersion({ provider, model }: ModelInfo): string {
	return `${provider}:${model}`;
}
