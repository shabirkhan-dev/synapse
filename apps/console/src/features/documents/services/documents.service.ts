import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { documentListSchema, documentSchema } from "../schemas/document.schema";
import type { DocumentSummary, IngestDocumentInput } from "../types/document.types";

export const documentsService = {
	/** Newest first (the API's default limit). */
	list: (): Promise<DocumentSummary[]> =>
		api(endpoints.documents.list, { schema: documentListSchema }),

	/** Chunks, embeds and stores it; the same content again returns the existing document. */
	ingest: (input: IngestDocumentInput): Promise<DocumentSummary> =>
		api(endpoints.documents.ingest, { method: "POST", body: input, schema: documentSchema }),
};
