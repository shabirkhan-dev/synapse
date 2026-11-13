import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { RAG_MESSAGES } from "../constants/rag.constants";
import {
	documentChunksQuerySchema,
	documentIdParamsSchema,
	ingestDocumentBodySchema,
	uploadDocumentBodySchema,
	listDocumentsQuerySchema,
	ragDocumentDetailSchema,
	ragDocumentSchema,
	ragQueryBodySchema,
	ragQueryResultSchema,
} from "../schemas/rag.schemas";
import {
	approvalRequestSchema,
	OVERSIGHT_ACTIONS,
	type OversightService,
} from "@/modules/oversight";

import type { RagService } from "../services/rag.service";

const security = [{ bearerAuth: [] }];

const ingestRoute = createRoute({
	method: "post",
	path: "/documents",
	tags: ["RAG"],
	summary: "Ingest a document: chunk, embed and store it",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: ingestDocumentBodySchema } } },
	},
	responses: {
		201: {
			description: "Document stored",
			content: { "application/json": { schema: successEnvelope(ragDocumentSchema) } },
		},
		200: {
			description: "Same content already ingested by this user; the existing document is returned",
			content: { "application/json": { schema: successEnvelope(ragDocumentSchema) } },
		},
		...errorResponses,
	},
});

const uploadRoute = createRoute({
	method: "post",
	path: "/documents/upload",
	tags: ["RAG"],
	summary: "Ingest a .txt, .md or .pdf file: extract its text, then chunk, embed and store it",
	security,
	request: {
		body: {
			required: true,
			content: { "multipart/form-data": { schema: uploadDocumentBodySchema } },
		},
	},
	responses: {
		201: {
			description: "Document stored; `source` is the file name, `metadata` its type and pages",
			content: { "application/json": { schema: successEnvelope(ragDocumentSchema) } },
		},
		200: {
			description: "Same text already ingested by this owner; the existing document is returned",
			content: { "application/json": { schema: successEnvelope(ragDocumentSchema) } },
		},
		415: {
			description: "Not a .txt, .md or .pdf, or the content does not match the name",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...errorResponses,
	},
});

const listRoute = createRoute({
	method: "get",
	path: "/documents",
	tags: ["RAG"],
	summary: "List your ingested documents",
	security,
	request: { query: listDocumentsQuerySchema },
	responses: {
		200: {
			description: "Documents, newest first",
			content: { "application/json": { schema: successEnvelope(z.array(ragDocumentSchema)) } },
		},
		...errorResponses,
	},
});

const detailRoute = createRoute({
	method: "get",
	path: "/documents/{id}",
	tags: ["RAG"],
	summary: "A document with one page of its chunks (in order) and the versions new chunks get",
	security,
	request: { params: documentIdParamsSchema, query: documentChunksQuerySchema },
	responses: {
		200: {
			description: "The document",
			content: { "application/json": { schema: successEnvelope(ragDocumentDetailSchema) } },
		},
		404: {
			description: "Not one of the active organization's documents",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...errorResponses,
	},
});

const deleteRoute = createRoute({
	method: "delete",
	path: "/documents/{id}",
	tags: ["RAG"],
	summary: "Delete a document and its chunks",
	security,
	request: { params: documentIdParamsSchema },
	responses: {
		200: {
			description: "Deleted",
			content: { "application/json": { schema: successEnvelope(z.object({ id: z.uuid() })) } },
		},
		...errorResponses,
	},
});

const queryRoute = createRoute({
	method: "post",
	path: "/query",
	tags: ["RAG"],
	summary: "Top-k vector search, optionally answered by the chat model",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: ragQueryBodySchema } } },
	},
	responses: {
		200: {
			description: "Matches (and an answer unless answer=false)",
			content: { "application/json": { schema: successEnvelope(ragQueryResultSchema) } },
		},
		...errorResponses,
	},
});

const purgeRoute = createRoute({
	method: "post",
	path: "/documents/purge",
	tags: ["RAG"],
	summary: "Ask to delete all your documents; runs only after approval (see /oversight)",
	security,
	responses: {
		202: {
			description: "Approval requested; nothing is deleted yet",
			content: { "application/json": { schema: successEnvelope(approvalRequestSchema) } },
		},
		...errorResponses,
	},
});

export function createRagRoutes(rag: RagService, oversight: OversightService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(purgeRoute, async (c) => {
		const approval = await oversight.request(
			OVERSIGHT_ACTIONS.PURGE_DOCUMENTS,
			// Owner = the organization (who may decide); requester = the person (who may see it).
			{ ownerId: c.get("user").orgId, requestedBy: c.get("user").sub },
			{ requestId: c.get("requestId"), actorId: c.get("user").sub },
		);
		return success(c, approval, RAG_MESSAGES.PURGE_REQUESTED, HTTP_STATUS.ACCEPTED);
	});

	app.openapi(ingestRoute, async (c) => {
		const { document, created } = await rag.ingest(c.get("user").orgId, c.req.valid("json"), {
			requestId: c.get("requestId"),
			actorId: c.get("user").sub,
		});
		if (!created) {
			return success(c, document, RAG_MESSAGES.DOCUMENT_ALREADY_INGESTED, HTTP_STATUS.OK);
		}
		return success(c, document, RAG_MESSAGES.DOCUMENT_INGESTED, HTTP_STATUS.CREATED);
	});

	app.openapi(uploadRoute, async (c) => {
		const { file, title } = c.req.valid("form");
		const { document, created } = await rag.ingestFile(
			c.get("user").orgId,
			{ file: { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }, title },
			{ requestId: c.get("requestId"), actorId: c.get("user").sub },
		);
		if (!created) {
			return success(c, document, RAG_MESSAGES.DOCUMENT_ALREADY_INGESTED, HTTP_STATUS.OK);
		}
		return success(c, document, RAG_MESSAGES.DOCUMENT_INGESTED, HTTP_STATUS.CREATED);
	});

	app.openapi(listRoute, async (c) => {
		const { limit } = c.req.valid("query");
		return success(
			c,
			await rag.listDocuments(c.get("user").orgId, limit),
			RAG_MESSAGES.DOCUMENTS_FETCHED,
		);
	});

	app.openapi(detailRoute, async (c) => {
		const detail = await rag.getDocument(
			c.get("user").orgId,
			c.req.valid("param").id,
			c.req.valid("query"),
		);
		return success(c, detail, RAG_MESSAGES.DOCUMENT_FETCHED, HTTP_STATUS.OK);
	});

	app.openapi(deleteRoute, async (c) => {
		const { id } = c.req.valid("param");
		await rag.deleteDocument(c.get("user").orgId, id, {
			requestId: c.get("requestId"),
			actorId: c.get("user").sub,
		});
		return success(c, { id }, RAG_MESSAGES.DOCUMENT_DELETED);
	});

	app.openapi(queryRoute, async (c) => {
		const { query, topK, answer, mode } = c.req.valid("json");
		const ownerId = c.get("user").orgId;
		if (!answer) {
			return success(
				c,
				{
					answer: null,
					matches: await rag.retrieve(
						ownerId,
						query,
						topK,
						{ requestId: c.get("requestId"), actorId: c.get("user").sub },
						mode,
					),
					citations: [],
					provenance: null,
				},
				RAG_MESSAGES.MATCHES_FOUND,
			);
		}
		const answered = await rag.answer(ownerId, query, topK, {
			requestId: c.get("requestId"),
			actorId: c.get("user").sub,
		});
		return success(c, answered, RAG_MESSAGES.QUERY_ANSWERED);
	});

	return app;
}
