/** What produced an answer. Every generated answer records one (architecture rule 4). */
export interface AnswerProvenance {
	/** Chat model id, e.g. `openai/gpt-4o-mini`. */
	model: string;
	/** Version of the prompt template used. */
	promptVersion: string;
	/** Embedding model id used for retrieval. */
	embeddingModel: string;
	/** Version of the embedding setup (model + chunking) the index was built with. */
	embeddingVersion: string;
}
