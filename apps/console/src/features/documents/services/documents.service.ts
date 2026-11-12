import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { CHUNK_PAGE_SIZE } from "../constants/documents.constants";
import {
	documentDetailSchema,
	documentListSchema,
	documentSchema,
} from "../schemas/document.schema";
import type { DocumentDetail, DocumentSummary, IngestDocumentInput } from "../types/document.types";

export const documentsService = {
	/** Newest first (the API's default limit). */
	list: (): Promise<DocumentSummary[]> =>
		api(endpoints.documents.list, { schema: documentListSchema }),

	/** Chunks, embeds and stores it; the same content again returns the existing document. */
	ingest: (input: IngestDocumentInput): Promise<DocumentSummary> =>
		api(endpoints.documents.ingest, { method: "POST", body: input, schema: documentSchema }),

	/** The document with one page of its chunks, in order. */
	detail: (id: string, offset: number): Promise<DocumentDetail> =>
		api(`${endpoints.documents.detail(id)}?offset=${offset}&limit=${CHUNK_PAGE_SIZE}`, {
			schema: documentDetailSchema,
		}),

	/** Deletes the document and its chunks at once (no approval, unlike deleting all). */
	remove: (id: string): Promise<unknown> =>
		api(endpoints.documents.detail(id), { method: "DELETE", schema: z.unknown() }),
};
