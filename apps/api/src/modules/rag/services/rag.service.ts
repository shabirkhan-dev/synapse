import type { ModelGateway } from "@synapse/core/contracts";
import { isSynapseError } from "@synapse/core/errors";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import {
	createIngestionPipeline,
	type IngestableDocument,
	type IngestionPipeline,
} from "@synapse/ingestion";
import {
	type ChunkOptions,
	type ChunkPreparer,
	createChunkPreparer,
	KNOWLEDGE_ERROR_CODES,
} from "@synapse/knowledge";
import { createRetriever, type RetrievalMode, type Retriever } from "@synapse/retrieval";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";

import {
	RAG_ANSWER_SYSTEM_PROMPT,
	RAG_DEFAULT_LIST_LIMIT,
	RAG_ERROR_CODES,
	RAG_MESSAGES,
} from "../constants/rag.constants";
import type { RagDocument, RagMatch, RagRepository } from "../types/rag.types";

export type RagServiceOptions = {
	chunk: ChunkOptions;
	defaultTopK: number;
	searchMode: RetrievalMode;
};

export type IngestInput = {
	title: string;
	content: string;
	source?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
};

/** `created: false` means the owner already had this content; nothing was re-embedded. */
export type IngestOutcome = {
	document: RagDocument;
	created: boolean;
};

export type RagAnswer = {
	answer: string;
	matches: RagMatch[];
};

export class RagService {
	/** chunk + embed with recorded versions, via `@synapse/knowledge`. */
	private readonly knowledge: ChunkPreparer;
	/** normalize → dedup (per owner) → chunk + embed + store, via `@synapse/ingestion`. */
	private readonly ingestion: IngestionPipeline<RagDocument>;
	/** vector or hybrid (vector + keyword, RRF) search, via `@synapse/retrieval`. */
	private readonly retriever: Retriever<RagMatch>;

	constructor(
		private readonly repository: RagRepository,
		private readonly models: ModelGateway,
		private readonly options: RagServiceOptions,
	) {
		this.knowledge = createChunkPreparer({
			embedding: models.embedding,
			chunking: options.chunk,
			dimensions: EMBEDDING_DIMENSIONS,
		});
		this.ingestion = createIngestionPipeline<RagDocument>({
			findByContentHash: (ownerId, hash) => repository.findByContentHash(ownerId, hash),
			index: (document) => this.index(document),
		});
		const knowledge = this.knowledge;
		this.retriever = createRetriever<RagMatch>(
			{
				embedQuery: (query) => knowledge.embedQuery(query).catch(toAppError),
				vectorSearch: (request) => repository.searchChunks(request),
				keywordSearch: (request) => repository.keywordSearch(request),
			},
			{ mode: options.searchMode, embeddingModel: knowledge.embeddingModel },
		);
	}

	async ingest(ownerId: string, input: IngestInput): Promise<IngestOutcome> {
		const result = await this.ingestion.ingest(ownerId, input);
		if (result.status === "empty") {
			throw emptyDocumentError();
		}
		return { document: result.document, created: result.status === "created" };
	}

	private async index(document: IngestableDocument): Promise<RagDocument> {
		const prepared = await this.knowledge.prepare(document.content).catch(toAppError);
		if (!prepared) {
			throw emptyDocumentError();
		}
		return this.repository.createDocument(
			{
				ownerId: document.ownerId,
				title: document.title,
				source: document.source,
				metadata: document.metadata,
				contentHash: document.contentHash,
			},
			prepared.chunks.map(({ chunkIndex, content, embedding }) => ({
				chunkIndex,
				content,
				embedding,
				chunkerVersion: prepared.chunkerVersion,
				embeddingModel: prepared.embeddingModel,
			})),
		);
	}

	async search(
		ownerId: string,
		query: string,
		topK = this.options.defaultTopK,
	): Promise<RagMatch[]> {
		return this.retriever.retrieve({ ownerId, query, topK });
	}

	async answer(ownerId: string, question: string, topK?: number): Promise<RagAnswer> {
		const matches = await this.search(ownerId, question, topK);
		if (matches.length === 0) {
			return { answer: RAG_MESSAGES.NO_DOCUMENTS_TO_ANSWER_FROM, matches };
		}
		const { text } = await this.models.chat.generateText({
			system: RAG_ANSWER_SYSTEM_PROMPT,
			prompt: `${formatContext(matches)}\n\nQuestion: ${question}`,
		});
		return { answer: text, matches };
	}

	listDocuments(ownerId: string, limit = RAG_DEFAULT_LIST_LIMIT): Promise<RagDocument[]> {
		return this.repository.listDocuments(ownerId, limit);
	}

	async deleteDocument(ownerId: string, documentId: string): Promise<void> {
		const deleted = await this.repository.deleteDocument(ownerId, documentId);
		if (!deleted) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: RAG_ERROR_CODES.DOCUMENT_NOT_FOUND,
				message: RAG_MESSAGES.DOCUMENT_NOT_FOUND,
			});
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

/** Map knowledge errors to API errors; anything else is rethrown unchanged. */
function toAppError(error: unknown): never {
	if (isSynapseError(error) && error.code === KNOWLEDGE_ERROR_CODES.EMBEDDING_DIMENSION_MISMATCH) {
		throw new AppError({
			statusCode: HTTP_STATUS.BAD_GATEWAY,
			code: RAG_ERROR_CODES.EMBEDDING_DIMENSION_MISMATCH,
			message: error.message,
			...(error.details ? { details: error.details } : {}),
			cause: error,
		});
	}
	throw error;
}

function emptyDocumentError(): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
		code: RAG_ERROR_CODES.EMPTY_DOCUMENT,
		message: RAG_MESSAGES.EMPTY_DOCUMENT,
	});
}
