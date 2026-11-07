import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";

import { errorResponses, success, successEnvelope } from "@/common/api-response";
import { AppError } from "@/common/app-error";
import type { AppBindings } from "@/common/app-types";

import type { RagService } from "./rag.service";
import {
	documentIdParamsSchema,
	ingestDocumentBodySchema,
	listDocumentsQuerySchema,
	ragDocumentSchema,
	ragQueryBodySchema,
	ragQueryResultSchema,
} from "./rag.schemas";

const security = [{ bearerAuth: [] }];

const ingestRoute = createRoute({
	method: "post",
	path: "/documents",
	tags: ["RAG"],
	summary: "Ingest a document: chunk, embed and store it",
	security,
	middleware: [
		bodyLimit({
			maxSize: 2 * 1024 * 1024,
			onError: () => {
				throw new AppError(413, "PAYLOAD_TOO_LARGE", "Document body must be 2 MB or smaller");
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
		const document = await rag.ingest(c.get("user").sub, c.req.valid("json"));
		return success(c, document, 201);
	});

	app.openapi(listRoute, async (c) => {
		const { limit } = c.req.valid("query");
		return success(c, await rag.listDocuments(c.get("user").sub, limit));
	});

	app.openapi(deleteRoute, async (c) => {
		const { id } = c.req.valid("param");
		await rag.deleteDocument(c.get("user").sub, id);
		return success(c, { id });
	});

	app.openapi(queryRoute, async (c) => {
		const { query, topK, answer } = c.req.valid("json");
		const ownerId = c.get("user").sub;
		if (!answer) {
			return success(c, { answer: null, matches: await rag.search(ownerId, query, topK) });
		}
		return success(c, await rag.answer(ownerId, query, topK));
	});

	return app;
}
