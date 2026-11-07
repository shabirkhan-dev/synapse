/**
 * How domain code talks to models. Implemented in `@synapse/adapters` (model-gateway); domain
 * packages depend on these interfaces, never on a vendor SDK (ADR-0003).
 */

/** Which model served a call — recorded for provenance. */
export interface ModelInfo {
	/** Provider name, e.g. `openrouter`. */
	provider: string;
	/** Model id, e.g. `openai/gpt-4o-mini`. */
	model: string;
}

export interface CallOptions {
	abortSignal?: AbortSignal;
}

export interface EmbeddingGateway {
	readonly info: ModelInfo;
	embed(value: string, options?: CallOptions): Promise<number[]>;
	/** One vector per input, in input order. */
	embedMany(values: string[], options?: CallOptions): Promise<number[][]>;
}

export interface TextGenerationRequest extends CallOptions {
	system?: string;
	prompt: string;
}

export interface TokenUsage {
	inputTokens?: number;
	outputTokens?: number;
}

export interface TextGenerationResult {
	text: string;
	model: ModelInfo;
	usage: TokenUsage;
}

export interface ChatGateway {
	readonly info: ModelInfo;
	generateText(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

export interface ModelGateway {
	chat: ChatGateway;
	embedding: EmbeddingGateway;
}
