import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import { errorResponses } from "@/shared/responses/error-response";
import { successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { RAG_MAX_DOCUMENT_BYTES, RAG_MESSAGES } from "../constants/rag.constants";
import {
	documentIdParamsSchema,
	ingestDocumentBodySchema,
	listDocumentsQuerySchema,
	ragDocumentSchema,
	ragQueryBodySchema,
	ragQueryResultSchema,
} from "../schemas/rag.schemas";
import type { RagService } from "../services/rag.service";

const security = [{ bearerAuth: [] }];

const ingestRoute = createRoute({
	method: "post",
	path: "/documents",
	tags: ["RAG"],
	summary: "Ingest a document: chunk, embed and store it",
	security,
	middleware: [
		bodyLimit({
			maxSize: RAG_MAX_DOCUMENT_BYTES,
			onError: () => {
				throw new AppError({
					statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
					code: ERROR_CODES.PAYLOAD_TOO_LARGE,
					message: RAG_MESSAGES.DOCUMENT_TOO_LARGE,
				});
			},
		}),
	] as const,
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

export function createRagRoutes(rag: RagService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(ingestRoute, async (c) => {
		const { document, created } = await rag.ingest(c.get("user").sub, c.req.valid("json"));
		if (!created) {
			return success(c, document, RAG_MESSAGES.DOCUMENT_ALREADY_INGESTED, HTTP_STATUS.OK);
		}
		return success(c, document, RAG_MESSAGES.DOCUMENT_INGESTED, HTTP_STATUS.CREATED);
	});

	app.openapi(listRoute, async (c) => {
		const { limit } = c.req.valid("query");
		return success(
			c,
			await rag.listDocuments(c.get("user").sub, limit),
			RAG_MESSAGES.DOCUMENTS_FETCHED,
		);
	});

	app.openapi(deleteRoute, async (c) => {
		const { id } = c.req.valid("param");
		await rag.deleteDocument(c.get("user").sub, id);
		return success(c, { id }, RAG_MESSAGES.DOCUMENT_DELETED);
	});

	app.openapi(queryRoute, async (c) => {
		const { query, topK, answer } = c.req.valid("json");
		const ownerId = c.get("user").sub;
		if (!answer) {
			return success(
				c,
				{ answer: null, matches: await rag.search(ownerId, query, topK) },
				RAG_MESSAGES.MATCHES_FOUND,
			);
		}
		return success(c, await rag.answer(ownerId, query, topK), RAG_MESSAGES.QUERY_ANSWERED);
	});

	return app;
}
