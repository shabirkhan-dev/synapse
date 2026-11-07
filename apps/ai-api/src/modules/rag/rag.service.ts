import { embed, embedMany, generateText, type EmbeddingModel, type LanguageModel } from "ai";

import { AppError } from "@/common/app-error";
import { EMBEDDING_DIMENSIONS } from "@/database/schema";

import { chunkText, type ChunkOptions } from "./text-chunker";
import type { RagDocument, RagMatch, RagRepository } from "./rag.types";

export type RagServiceOptions = {
	chunk: ChunkOptions;
	defaultTopK: number;
};

export type IngestInput = {
	title: string;
	content: string;
	source?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
};

export type RagAnswer = {
	answer: string;
	matches: RagMatch[];
};

export const ragAnswerSystemPrompt = [
	"You answer questions using only the numbered context passages provided.",
	"Cite passages inline as [1], [2], ... matching their numbers.",
	"If the context does not contain the answer, say you do not know.",
].join("\n");

export class RagService {
	constructor(
		private readonly repository: RagRepository,
		private readonly models: { chat: LanguageModel; embedding: EmbeddingModel },
		private readonly options: RagServiceOptions,
	) {}

	async ingest(ownerId: string, input: IngestInput): Promise<RagDocument> {
		const pieces = chunkText(input.content, this.options.chunk);
		if (pieces.length === 0) {
			throw new AppError(422, "RAG_EMPTY_DOCUMENT", "Document content is empty");
		}
		const { embeddings } = await embedMany({ model: this.models.embedding, values: pieces });
		embeddings.forEach(assertDimensions);
		return this.repository.createDocument(
			{
				ownerId,
				title: input.title,
				source: input.source ?? null,
				metadata: input.metadata ?? {},
			},
			pieces.map((content, chunkIndex) => ({
				chunkIndex,
				content,
				embedding: embeddings[chunkIndex] ?? [],
			})),
		);
	}

	async search(
		ownerId: string,
		query: string,
		topK = this.options.defaultTopK,
	): Promise<RagMatch[]> {
		const { embedding } = await embed({ model: this.models.embedding, value: query });
		assertDimensions(embedding);
		return this.repository.searchChunks(ownerId, embedding, topK);
	}

	async answer(ownerId: string, question: string, topK?: number): Promise<RagAnswer> {
		const matches = await this.search(ownerId, question, topK);
		if (matches.length === 0) {
			return { answer: "I could not find any ingested documents to answer from.", matches };
		}
		const { text } = await generateText({
			model: this.models.chat,
			system: ragAnswerSystemPrompt,
			prompt: `${formatContext(matches)}\n\nQuestion: ${question}`,
		});
		return { answer: text, matches };
	}

	listDocuments(ownerId: string, limit = 50): Promise<RagDocument[]> {
		return this.repository.listDocuments(ownerId, limit);
	}

	async deleteDocument(ownerId: string, documentId: string): Promise<void> {
		const deleted = await this.repository.deleteDocument(ownerId, documentId);
		if (!deleted) {
			throw new AppError(404, "RAG_DOCUMENT_NOT_FOUND", "Document not found");
		}
	}
}

export function formatContext(matches: RagMatch[]): string {
	return matches
		.map(
			(match, index) =>
				`[${index + 1}] ${match.documentTitle}${match.source ? ` (${match.source})` : ""}\n${match.content}`,
		)
		.join("\n\n");
}

function assertDimensions(embedding: number[]): void {
	if (embedding.length !== EMBEDDING_DIMENSIONS) {
		throw new AppError(
			502,
			"RAG_EMBEDDING_DIMENSION_MISMATCH",
			`Embedding model returned ${embedding.length} dimensions; the database expects ${EMBEDDING_DIMENSIONS}`,
		);
	}
}
