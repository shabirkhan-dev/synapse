import type { ChatGateway, ModelInfo } from "@synapse/core/contracts";
import type { AnswerProvenance } from "@synapse/core/types";

import { extractCitations } from "../citations/extract-citations";
import { buildContext, type Citation, type ContextPassage } from "../context/build-context";
import { type PromptTemplate, promptVersion } from "../prompts/prompt";
import { RAG_ANSWER_PROMPT } from "../prompts/templates";

export type AnswerGeneratorOptions = {
	chat: ChatGateway;
	/** Versions of the index the passages came from (from `@synapse/knowledge`). */
	embeddingModel: string;
	chunkerVersion: string;
	/** Token budget for the numbered passages. */
	maxContextTokens: number;
	prompt?: PromptTemplate;
};

export type GeneratedAnswer = {
	text: string;
	/** Passages the answer cites, in order of first mention. */
	citations: Citation[];
	/** Every passage shown to the model. */
	context: Citation[];
	provenance: AnswerProvenance;
};

function modelVersion({ provider, model }: ModelInfo): string {
	return `${provider}:${model}`;
}

/** context (within budget) → completion → citations, with provenance on every answer. */
export function createAnswerGenerator({
	chat,
	embeddingModel,
	chunkerVersion,
	maxContextTokens,
	prompt = RAG_ANSWER_PROMPT,
}: AnswerGeneratorOptions) {
	return {
		async answer({
			question,
			passages,
			abortSignal,
		}: {
			question: string;
			passages: ContextPassage[];
			abortSignal?: AbortSignal;
		}): Promise<GeneratedAnswer> {
			const context = buildContext(passages, { maxTokens: maxContextTokens });
			const result = await chat.generateText({
				system: prompt.system,
				prompt: `${context.text}\n\nQuestion: ${question}`,
				...(abortSignal ? { abortSignal } : {}),
			});
			return {
				text: result.text,
				citations: extractCitations(result.text, context.citations),
				context: context.citations,
				provenance: {
					chatModel: modelVersion(result.model),
					promptVersion: promptVersion(prompt),
					embeddingModel,
					chunkerVersion,
					usage: result.usage,
				},
			};
		},
	};
}

export type AnswerGenerator = ReturnType<typeof createAnswerGenerator>;
