import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import {
	type ModelGateway,
	type PdfTextExtractor,
	type Reranker,
	WEB_PAGE_ERROR_CODES,
	type WebPageReader,
} from "@synapse/core/contracts";
import type { AnswerProvenance } from "@synapse/core/types";
import { isSynapseError } from "@synapse/core/errors";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import {
	createIngestionPipeline,
	extractFileText,
	type FileExtraction,
	type UploadedFile,
	type IngestableDocument,
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
	suggestFollowUps,
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
import type {
	DocumentAccess,
	RagDocument,
	RagDocumentDetail,
	RagMatch,
	RagReader,
	RagRepository,
} from "../types/rag.types";

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
	/** Reads public web pages by URL, refusing internal addresses (`@synapse/adapters/web`). */
	web: WebPageReader;
	/** Second-stage ranking of the best `candidates`; a failure falls back to the fused order. */
	rerank?: { reranker: Reranker; candidates: number; onError: (error: unknown) => void };
};

const NO_REQUEST: RequestContext = { requestId: null };

export type IngestInput = {
	title: string;
	content: string;
	source?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
	/** Who may read it (ADR-0008); default `organization`. `restricted` starts as the adder's only. */
	access?: DocumentAccess | undefined;
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
					const matches = await this.search(
						context.reader,
						question,
						context.topK,
						undefined,
						context.documentIds,
					);
					const sanitized = await options.guardrails.sanitizePassages(
						context.reader.ownerId,
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
		reader: RagReader,
		{ access = "organization", ...input }: IngestInput,
		context: RequestContext = NO_REQUEST,
	): Promise<IngestOutcome> {
		const { ownerId } = reader;
		// normalize → dedup (per owner) → chunk + embed + store, via `@synapse/ingestion`; built per
		// call so the access level and adder are stored in the same insert as the document.
		const pipeline = createIngestionPipeline<RagDocument>({
			findByContentHash: (owner, hash) => this.repository.findByContentHash(owner, hash),
			index: (document) => this.index(document, { access, createdBy: reader.userId }),
		});
		const result = await pipeline.ingest(ownerId, input);
		if (result.status === "empty") {
			throw emptyDocumentError();
		}
		const { document } = result;
		// The same text exists in a document this reader may not read: say so without revealing it.
		if (
			result.status === "duplicate" &&
			!(await this.repository.findDocument(reader, document.id))
		) {
			throw new AppError({
				statusCode: HTTP_STATUS.CONFLICT,
				code: RAG_ERROR_CODES.DUPLICATE_OF_RESTRICTED,
				message: RAG_MESSAGES.DUPLICATE_OF_RESTRICTED,
			});
		}
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
					access: document.access,
				},
				provenance: null,
			});
		}
		return { document, created: result.status === "created" };
	}

	/** Text from an uploaded .txt, .md or .pdf, then the same path as `ingest` (dedup included). */
	async ingestFile(
		reader: RagReader,
		upload: { file: UploadedFile; title?: string | undefined; access?: DocumentAccess | undefined },
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
			reader,
			{
				access: upload.access,
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

	/** A public web page's text (headings kept), then the same path as `ingest` (dedup included). */
	async ingestUrl(
		reader: RagReader,
		input: { url: string; title?: string | undefined; access?: DocumentAccess | undefined },
		context: RequestContext = NO_REQUEST,
	): Promise<IngestOutcome> {
		const page = await this.options.web.read(input.url).catch(webPageError);
		if (!page.text.trim()) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				code: RAG_ERROR_CODES.URL_HAS_NO_TEXT,
				message: RAG_MESSAGES.URL_HAS_NO_TEXT,
			});
		}
		if (page.text.length > RAG_MAX_DOCUMENT_CHARS) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				code: RAG_ERROR_CODES.FILE_TOO_LONG,
				message: RAG_MESSAGES.FILE_TOO_LONG(RAG_MAX_DOCUMENT_CHARS),
			});
		}
		const title = input.title ?? page.title ?? new URL(page.url).hostname;
		return this.ingest(
			reader,
			{
				access: input.access,
				title: title.slice(0, RAG_MAX_TITLE_CHARS),
				content: page.text,
				source: page.url,
				metadata: { url: page.url, mediaType: page.mediaType, fetchedAt: new Date().toISOString() },
			},
			context,
		);
	}

	private async index(
		document: IngestableDocument,
		{ access, createdBy }: { access: DocumentAccess; createdBy: string | null },
	): Promise<RagDocument> {
		const prepared = await this.knowledge
			.prepare(document.content, { title: document.title })
			.catch(toAppError);
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
				access,
				createdBy,
			},
			prepared.chunks.map(({ chunkIndex, content, context, embedding }) => ({
				chunkIndex,
				content,
				context,
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
		reader: RagReader,
		query: string,
		topK = this.options.defaultTopK,
		mode?: RetrievalMode,
		/** Search only these documents of the owner; absent or empty = all of them. */
		documentIds?: readonly string[],
	): Promise<RagMatch[]> {
		return this.retriever.retrieve({
			ownerId: reader.ownerId,
			// Only documents this reader may read are searched (ADR-0008).
			reader: reader.userId === null ? { userId: null, readsAll: true } : reader,
			query,
			topK,
			...(mode ? { mode } : {}),
			...(documentIds?.length ? { documentIds } : {}),
		});
	}

	/** A user's search (`answer: false`): input policy first, then retrieval (any mode). */
	async retrieve(
		reader: RagReader,
		query: string,
		topK?: number,
		context: RequestContext = NO_REQUEST,
		mode?: RetrievalMode,
		documentIds?: readonly string[],
	): Promise<RagMatch[]> {
		await this.options.guardrails.checkInput(reader.ownerId, query, "rag.query", context);
		return this.search(reader, query, topK, mode, documentIds);
	}

	async answer(
		reader: RagReader,
		question: string,
		topK?: number,
		context: RequestContext = NO_REQUEST,
		/** Answer only from these documents of the owner. */
		documentIds?: readonly string[],
	): Promise<RagAnswer> {
		const { ownerId } = reader;
		await this.options.guardrails.checkInput(ownerId, question, "rag.query", context);
		const { passages: matches, answer } = await this.answerGraph.run({
			question,
			context: {
				reader,
				requestId: context.requestId,
				...(context.actorId ? { actorId: context.actorId } : {}),
				...(topK === undefined ? {} : { topK }),
				...(documentIds?.length ? { documentIds } : {}),
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
				// Traceability: the answer could only draw on these documents.
				...(documentIds?.length ? { scopedToDocumentIds: [...documentIds] } : {}),
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

	/**
	 * Up to three questions to ask next about an answer (the chat model, `follow-ups@1`). The
	 * question passes the input policy again; a suggestion carrying instructions is dropped.
	 */
	async followUps(
		ownerId: string,
		input: { question: string; answer: string },
		context: RequestContext = NO_REQUEST,
	): Promise<{ questions: string[]; chatModel: string; promptVersion: string }> {
		await this.options.guardrails.checkInput(ownerId, input.question, "rag.query", context);
		const suggested = await suggestFollowUps({ chat: this.models.chat, ...input });
		return {
			questions: suggested.questions.filter((question) =>
				this.options.guardrails.isPlainSuggestion(question),
			),
			chatModel: `${suggested.model.provider}:${suggested.model.model}`,
			promptVersion: suggested.promptVersion,
		};
	}

	listDocuments(reader: RagReader, limit = RAG_DEFAULT_LIST_LIMIT): Promise<RagDocument[]> {
		return this.repository.listDocuments(reader, limit);
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

	async hasDocument(reader: RagReader, documentId: string): Promise<boolean> {
		return (await this.repository.findDocument(reader, documentId)) !== null;
	}

	/** The document, or 404 when it is missing or this reader may not read it (never 403: no hint). */
	private async readable(reader: RagReader, documentId: string): Promise<RagDocument> {
		const document = await this.repository.findDocument(reader, documentId);
		if (!document) throw documentNotFoundError();
		return document;
	}

	/** A document and one page of its chunks; 404 unless this reader may read it (ADR-0008). */
	async getDocument(
		reader: RagReader,
		documentId: string,
		{ offset, limit }: { offset: number; limit: number },
	): Promise<RagDocumentDetail> {
		const document = await this.readable(reader, documentId);
		const [chunks, sharedWith] = await Promise.all([
			this.repository.listChunks({ ownerId: reader.ownerId, documentId, offset, limit }),
			document.access === "restricted"
				? this.repository.listDocumentMembers(documentId)
				: Promise.resolve([]),
		]);
		return {
			...document,
			chunks,
			page: { offset, limit, total: document.chunkCount },
			current: {
				chunkerVersion: this.knowledge.chunkerVersion,
				embeddingModel: this.knowledge.embeddingModel,
			},
			sharedWith,
			canManageAccess: canManage(reader, document),
		};
	}

	/**
	 * Who may read a document: the whole organization, or (`restricted`) its adder, the given
	 * organization members, owners and admins. Only the adder, owners and admins may change it.
	 */
	async setAccess(
		reader: RagReader,
		documentId: string,
		{ access, userIds }: { access: DocumentAccess; userIds: readonly string[] },
		context: RequestContext = NO_REQUEST,
	): Promise<{ access: DocumentAccess; sharedWith: string[] }> {
		const document = await this.readable(reader, documentId);
		if (!canManage(reader, document)) throw accessForbiddenError();
		const unique = [...new Set(userIds)].filter((id) => id !== document.createdBy);
		const sharedWith = await this.repository.setDocumentAccess({
			ownerId: reader.ownerId,
			documentId,
			access,
			userIds: access === "restricted" ? unique : [],
		});
		if (!sharedWith) throw documentNotFoundError();
		await this.options.audit.record({
			ownerId: reader.ownerId,
			actorId: context.actorId ?? reader.userId ?? reader.ownerId,
			action: AUDIT_ACTIONS.RAG_DOCUMENT_ACCESS_CHANGED,
			subjectType: "document",
			subjectId: documentId,
			requestId: context.requestId,
			data: { access, sharedWith },
			provenance: null,
		});
		return { access, sharedWith };
	}

	async deleteDocument(
		reader: RagReader,
		documentId: string,
		context: RequestContext = NO_REQUEST,
	): Promise<void> {
		const document = await this.readable(reader, documentId);
		// A restricted document is removed only by those who decide who reads it.
		if (document.access === "restricted" && !canManage(reader, document)) {
			throw accessForbiddenError();
		}
		const deleted = await this.repository.deleteDocument(reader, documentId);
		if (!deleted) throw documentNotFoundError();
		const ownerId = reader.ownerId;
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

/** The adder of a document, owners and admins decide who reads it (ADR-0008). */
function canManage(reader: RagReader, document: RagDocument): boolean {
	return reader.readsAll || document.createdBy === reader.userId;
}

function documentNotFoundError(): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.NOT_FOUND,
		code: RAG_ERROR_CODES.DOCUMENT_NOT_FOUND,
		message: RAG_MESSAGES.DOCUMENT_NOT_FOUND,
	});
}

function accessForbiddenError(): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.FORBIDDEN,
		code: RAG_ERROR_CODES.DOCUMENT_ACCESS_FORBIDDEN,
		message: RAG_MESSAGES.DOCUMENT_ACCESS_FORBIDDEN,
	});
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

/** The reader's refusals, as API errors with a message for people. */
function webPageError(error: unknown): never {
	if (!isSynapseError(error)) throw error;
	const reason: Record<string, [string, string, AppError["statusCode"]]> = {
		[WEB_PAGE_ERROR_CODES.NOT_ALLOWED]: [
			RAG_ERROR_CODES.URL_NOT_ALLOWED,
			RAG_MESSAGES.URL_NOT_ALLOWED,
			HTTP_STATUS.UNPROCESSABLE_ENTITY,
		],
		[WEB_PAGE_ERROR_CODES.UNREACHABLE]: [
			RAG_ERROR_CODES.URL_UNREACHABLE,
			RAG_MESSAGES.URL_UNREACHABLE,
			HTTP_STATUS.UNPROCESSABLE_ENTITY,
		],
		[WEB_PAGE_ERROR_CODES.TOO_MANY_REDIRECTS]: [
			RAG_ERROR_CODES.URL_UNREACHABLE,
			RAG_MESSAGES.URL_UNREACHABLE,
			HTTP_STATUS.UNPROCESSABLE_ENTITY,
		],
		[WEB_PAGE_ERROR_CODES.TIMEOUT]: [
			RAG_ERROR_CODES.URL_TIMED_OUT,
			RAG_MESSAGES.URL_TIMED_OUT,
			HTTP_STATUS.UNPROCESSABLE_ENTITY,
		],
		[WEB_PAGE_ERROR_CODES.TOO_LARGE]: [
			RAG_ERROR_CODES.URL_TOO_LARGE,
			RAG_MESSAGES.URL_TOO_LARGE,
			HTTP_STATUS.UNPROCESSABLE_ENTITY,
		],
		[WEB_PAGE_ERROR_CODES.UNSUPPORTED_TYPE]: [
			RAG_ERROR_CODES.URL_UNSUPPORTED,
			RAG_MESSAGES.URL_UNSUPPORTED,
			HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
		],
	};
	const mapped = reason[error.code];
	if (!mapped) throw error;
	const [code, message, statusCode] = mapped;
	throw new AppError({ statusCode, code, message, cause: error });
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
	const reason = {
		"no-text": [RAG_ERROR_CODES.FILE_HAS_NO_TEXT, RAG_MESSAGES.FILE_HAS_NO_TEXT],
		unreadable: [RAG_ERROR_CODES.FILE_UNREADABLE, RAG_MESSAGES.FILE_UNREADABLE],
		"timed-out": [RAG_ERROR_CODES.FILE_TIMED_OUT, RAG_MESSAGES.FILE_TIMED_OUT],
	} as const;
	const [code, message] = reason[status];
	return new AppError({ statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY, code, message });
}

/** Who and how much to retrieve for one answer run. */
type AnswerScope = {
	reader: RagReader;
	requestId: string | null;
	actorId?: string;
	topK?: number;
	documentIds?: readonly string[];
};

function toContextPassage(match: RagMatch) {
	return {
		chunkId: match.chunkId,
		documentId: match.documentId,
		title: match.documentTitle,
		source: match.source,
		content: match.content,
	};
}
