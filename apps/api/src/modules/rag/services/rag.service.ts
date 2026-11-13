import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import type { ModelGateway, PdfTextExtractor, Reranker } from "@synapse/core/contracts";
import type { AnswerProvenance } from "@synapse/core/types";
import { isSynapseError } from "@synapse/core/errors";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import {
	createIngestionPipeline,
	extractFileText,
	type FileExtraction,
	type UploadedFile,
	type IngestableDocument,
	type IngestionPipeline,
} from "@synapse/ingestion";
import {
	type ChunkOptions,
	type ChunkPreparer,
	createChunkPreparer,
	KNOWLEDGE_ERROR_CODES,
} from "@synapse/knowledge";
import {
	type AnswerGenerator,
	type Citation,
	createAnswerGenerator,
	type GeneratedAnswer,
	RAG_ANSWER_CITED_PROMPT,
} from "@synapse/generation";
import { createRagAnswerGraph, type RagAnswerGraph } from "@synapse/orchestration";
import { createRetriever, type RetrievalMode, type Retriever } from "@synapse/retrieval";

import type { GuardrailsService } from "@/modules/guardrails";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/types/app-types";

import {
	RAG_DEFAULT_LIST_LIMIT,
	RAG_ERROR_CODES,
	RAG_MAX_DOCUMENT_CHARS,
	RAG_MAX_TITLE_CHARS,
	RAG_MESSAGES,
} from "../constants/rag.constants";
import type { RagDocument, RagDocumentDetail, RagMatch, RagRepository } from "../types/rag.types";

export type RagServiceOptions = {
	chunk: ChunkOptions;
	defaultTopK: number;
	searchMode: RetrievalMode;
	maxContextTokens: number;
	/** Token counter for the context budget (default: ~4 characters per token). */
	countTokens?: (text: string) => number;
	/** Answers (with provenance), ingests and deletes are recorded here. */
	audit: AuditLog;
	/** Input policy, passage sanitizing (prompt injection) and answer checks. */
	guardrails: GuardrailsService;
	/** Reads uploaded PDFs (`@synapse/adapters/pdf`). */
	pdf: PdfTextExtractor;
	/** Second-stage ranking of the best `candidates`; a failure falls back to the fused order. */
	rerank?: { reranker: Reranker; candidates: number; onError: (error: unknown) => void };
};

const NO_REQUEST: RequestContext = { requestId: null };

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
	/** Passages the answer cites. */
	citations: Citation[];
	/** Model, prompt version and index versions behind the answer; null when no model was called. */
	provenance: AnswerProvenance | null;
};

export class RagService {
	/** chunk + embed with recorded versions, via `@synapse/knowledge`. */
	private readonly knowledge: ChunkPreparer;
	/** normalize → dedup (per owner) → chunk + embed + store, via `@synapse/ingestion`. */
	private readonly ingestion: IngestionPipeline<RagDocument>;
	/** vector or hybrid (vector + keyword, RRF) search, via `@synapse/retrieval`. */
	private readonly retriever: Retriever<RagMatch>;
	/** versioned prompt + budgeted context + citations + provenance, via `@synapse/generation`. */
	private readonly generator: AnswerGenerator;
	/** Same, with the stricter prompt used when an answer cited nothing. */
	private readonly citedGenerator: AnswerGenerator;
	/** retrieve → generate → one stricter retry without citations, via `@synapse/orchestration`. */
	private readonly answerGraph: RagAnswerGraph<RagMatch, GeneratedAnswer, AnswerScope>;

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
			{
				mode: options.searchMode,
				embeddingModel: knowledge.embeddingModel,
				...(options.rerank
					? { rerank: { ...options.rerank, text: (match: RagMatch) => match.content } }
					: {}),
			},
		);
		const generatorOptions = {
			chat: models.chat,
			embeddingModel: knowledge.embeddingModel,
			chunkerVersion: knowledge.chunkerVersion,
			maxContextTokens: options.maxContextTokens,
			...(options.countTokens ? { countTokens: options.countTokens } : {}),
		};
		this.generator = createAnswerGenerator(generatorOptions);
		this.citedGenerator = createAnswerGenerator({
			...generatorOptions,
			prompt: RAG_ANSWER_CITED_PROMPT,
		});
		// In-request runs: no checkpointer (a failed request is simply retried by the client).
		this.answerGraph = createRagAnswerGraph<RagMatch, GeneratedAnswer, AnswerScope>({
			ports: {
				// Passages are sanitized once, here: the model (and the returned matches) see the cleaned text.
				retrieve: async ({ question, context }) => {
					const matches = await this.search(context.ownerId, question, context.topK);
					const sanitized = await options.guardrails.sanitizePassages(
						context.ownerId,
						matches.map((match) => Object.assign({}, match, { id: match.chunkId })),
						"rag.query",
						{
							requestId: context.requestId,
							...(context.actorId ? { actorId: context.actorId } : {}),
						},
					);
					return sanitized.map(({ id: _id, ...match }) => match);
				},
				answer: ({ question, passages, attempt }) =>
					(attempt === 1 ? this.generator : this.citedGenerator).answer({
						question,
						passages: passages.map(toContextPassage),
					}),
			},
		});
	}

	async ingest(
		ownerId: string,
		input: IngestInput,
		context: RequestContext = NO_REQUEST,
	): Promise<IngestOutcome> {
		const result = await this.ingestion.ingest(ownerId, input);
		if (result.status === "empty") {
			throw emptyDocumentError();
		}
		const { document } = result;
		if (result.status === "created") {
			await this.options.audit.record({
				ownerId,
				actorId: context.actorId ?? ownerId,
				action: AUDIT_ACTIONS.RAG_DOCUMENT_INGESTED,
				subjectType: "document",
				subjectId: document.id,
				requestId: context.requestId,
				data: {
					title: document.title,
					source: document.source,
					chunkCount: document.chunkCount,
					contentHash: document.contentHash,
				},
				provenance: null,
			});
		}
		return { document, created: result.status === "created" };
	}

	/** Text from an uploaded .txt, .md or .pdf, then the same path as `ingest` (dedup included). */
	async ingestFile(
		ownerId: string,
		upload: { file: UploadedFile; title?: string | undefined },
		context: RequestContext = NO_REQUEST,
	): Promise<IngestOutcome> {
		const extracted = await extractFileText(upload.file, { pdf: this.options.pdf });
		if (extracted.status !== "extracted") throw fileRejectedError(extracted.status);
		if (extracted.content.length > RAG_MAX_DOCUMENT_CHARS) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				code: RAG_ERROR_CODES.FILE_TOO_LONG,
				message: RAG_MESSAGES.FILE_TOO_LONG(RAG_MAX_DOCUMENT_CHARS),
			});
		}
		const title = (upload.title ?? extracted.title) || upload.file.name;
		return this.ingest(
			ownerId,
			{
				title: title.slice(0, RAG_MAX_TITLE_CHARS),
				content: extracted.content,
				source: upload.file.name,
				metadata: {
					fileName: upload.file.name,
					mediaType: extracted.mediaType,
					...(extracted.pages === null ? {} : { pages: extracted.pages }),
				},
			},
			context,
		);
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

	/** What new chunks and searches use today: recorded with answers that may have searched. */
	get versions(): { embeddingModel: string; chunkerVersion: string } {
		return {
			embeddingModel: this.knowledge.embeddingModel,
			chunkerVersion: this.knowledge.chunkerVersion,
		};
	}

	async search(
		ownerId: string,
		query: string,
		topK = this.options.defaultTopK,
		mode?: RetrievalMode,
	): Promise<RagMatch[]> {
		return this.retriever.retrieve({ ownerId, query, topK, ...(mode ? { mode } : {}) });
	}

	/** A user's search (`answer: false`): input policy first, then retrieval (any mode). */
	async retrieve(
		ownerId: string,
		query: string,
		topK?: number,
		context: RequestContext = NO_REQUEST,
		mode?: RetrievalMode,
	): Promise<RagMatch[]> {
		await this.options.guardrails.checkInput(ownerId, query, "rag.query", context);
		return this.search(ownerId, query, topK, mode);
	}

	async answer(
		ownerId: string,
		question: string,
		topK?: number,
		context: RequestContext = NO_REQUEST,
	): Promise<RagAnswer> {
		await this.options.guardrails.checkInput(ownerId, question, "rag.query", context);
		const { passages: matches, answer } = await this.answerGraph.run({
			question,
			context: {
				ownerId,
				requestId: context.requestId,
				...(context.actorId ? { actorId: context.actorId } : {}),
				...(topK === undefined ? {} : { topK }),
			},
		});
		if (!answer) {
			return {
				answer: RAG_MESSAGES.NO_DOCUMENTS_TO_ANSWER_FROM,
				matches,
				citations: [],
				provenance: null,
			};
		}
		const text = await this.options.guardrails.guardAnswer(ownerId, answer.text, context);
		// Only when the reranker actually ordered these passages (not after a fallback).
		const reranker = matches.some((match) => match.ranks?.rerank !== undefined)
			? this.retriever.reranker
			: null;
		const provenance = reranker ? { ...answer.provenance, reranker } : answer.provenance;
		// Recorded before returning: an answer is only given out once it is traceable.
		await this.options.audit.record({
			ownerId,
			actorId: context.actorId ?? ownerId,
			action: AUDIT_ACTIONS.RAG_QUERY_ANSWERED,
			subjectType: "query",
			subjectId: null,
			requestId: context.requestId,
			data: {
				question,
				answer: text,
				citedChunkIds: answer.citations.map((citation) => citation.chunkId),
				contextChunkIds: answer.context.map((citation) => citation.chunkId),
			},
			provenance,
		});
		return {
			answer: text,
			matches,
			citations: answer.citations,
			provenance,
		};
	}

	listDocuments(ownerId: string, limit = RAG_DEFAULT_LIST_LIMIT): Promise<RagDocument[]> {
		return this.repository.listDocuments(ownerId, limit);
	}

	/** Runs only after an approval (`rag.purge-documents`, see the oversight module). */
	async purgeDocuments(ownerId: string, actorId: string = ownerId): Promise<{ deleted: number }> {
		const context: RequestContext = { requestId: null, actorId };
		const deleted = await this.repository.deleteAllDocuments(ownerId);
		await this.options.audit.record({
			ownerId,
			actorId: context.actorId ?? ownerId,
			action: AUDIT_ACTIONS.RAG_DOCUMENTS_PURGED,
			subjectType: "document",
			subjectId: null,
			requestId: null,
			data: { deleted },
			provenance: null,
		});
		return { deleted };
	}

	/** A document and one page of its chunks; 404 unless it belongs to the owner. */
	async getDocument(
		ownerId: string,
		documentId: string,
		{ offset, limit }: { offset: number; limit: number },
	): Promise<RagDocumentDetail> {
		const document = await this.repository.findDocument(ownerId, documentId);
		if (!document) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: RAG_ERROR_CODES.DOCUMENT_NOT_FOUND,
				message: RAG_MESSAGES.DOCUMENT_NOT_FOUND,
			});
		}
		const chunks = await this.repository.listChunks({ ownerId, documentId, offset, limit });
		return {
			...document,
			chunks,
			page: { offset, limit, total: document.chunkCount },
			current: {
				chunkerVersion: this.knowledge.chunkerVersion,
				embeddingModel: this.knowledge.embeddingModel,
			},
		};
	}

	async deleteDocument(
		ownerId: string,
		documentId: string,
		context: RequestContext = NO_REQUEST,
	): Promise<void> {
		const deleted = await this.repository.deleteDocument(ownerId, documentId);
		if (!deleted) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: RAG_ERROR_CODES.DOCUMENT_NOT_FOUND,
				message: RAG_MESSAGES.DOCUMENT_NOT_FOUND,
			});
		}
		await this.options.audit.record({
			ownerId,
			actorId: context.actorId ?? ownerId,
			action: AUDIT_ACTIONS.RAG_DOCUMENT_DELETED,
			subjectType: "document",
			subjectId: documentId,
			requestId: context.requestId,
			data: {},
			provenance: null,
		});
	}
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

function fileRejectedError(status: Exclude<FileExtraction["status"], "extracted">): AppError {
	if (status === "unsupported") {
		return new AppError({
			statusCode: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
			code: RAG_ERROR_CODES.UNSUPPORTED_FILE,
			message: RAG_MESSAGES.UNSUPPORTED_FILE,
		});
	}
	return new AppError({
		statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
		code: status === "no-text" ? RAG_ERROR_CODES.FILE_HAS_NO_TEXT : RAG_ERROR_CODES.FILE_UNREADABLE,
		message: status === "no-text" ? RAG_MESSAGES.FILE_HAS_NO_TEXT : RAG_MESSAGES.FILE_UNREADABLE,
	});
}

/** Who and how much to retrieve for one answer run. */
type AnswerScope = { ownerId: string; requestId: string | null; actorId?: string; topK?: number };

function toContextPassage(match: RagMatch) {
	return {
		chunkId: match.chunkId,
		documentId: match.documentId,
		title: match.documentTitle,
		source: match.source,
		content: match.content,
	};
}
