import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { CHUNK_PAGE_SIZE } from "../constants/documents.constants";
import {
	documentAccessResultSchema,
	documentDetailSchema,
	documentListSchema,
	documentSchema,
} from "../schemas/document.schema";
import type {
	DocumentAccess,
	DocumentAccessInput,
	DocumentDetail,
	DocumentSummary,
	IngestDocumentInput,
	UploadDocumentInput,
	WebPageInput,
	WithAccess,
} from "../types/document.types";

export const documentsService = {
	/** Newest first (the API's default limit). */
	list: (): Promise<DocumentSummary[]> =>
		api(endpoints.documents.list, { schema: documentListSchema }),

	/** Documents whose title contains `q`, newest first. */
	search: (q: string): Promise<DocumentSummary[]> =>
		api(`${endpoints.documents.list}?${new URLSearchParams({ q, limit: "20" })}`, {
			schema: documentListSchema,
		}),

	/** Chunks, embeds and stores it; the same content again returns the existing document. */
	ingest: (input: WithAccess<IngestDocumentInput>): Promise<DocumentSummary> =>
		api(endpoints.documents.ingest, { method: "POST", body: input, schema: documentSchema }),

	/** A .txt, .md or .pdf: the API extracts the text, then stores it like `ingest`. */
	upload: ({ file, title, access }: WithAccess<UploadDocumentInput>): Promise<DocumentSummary> => {
		const form = new FormData();
		form.append("file", file);
		if (title) form.append("title", title);
		if (access) form.append("access", access);
		return api(endpoints.documents.upload, { method: "POST", body: form, schema: documentSchema });
	},

	/** A public web page: the API reads it (refusing internal addresses), then stores it like `ingest`. */
	addWebPage: (input: WithAccess<WebPageInput>): Promise<DocumentSummary> =>
		api(endpoints.documents.url, { method: "POST", body: input, schema: documentSchema }),

	/** The document with one page of its chunks, in order. */
	detail: (id: string, offset: number): Promise<DocumentDetail> =>
		api(`${endpoints.documents.detail(id)}?offset=${offset}&limit=${CHUNK_PAGE_SIZE}`, {
			schema: documentDetailSchema,
		}),

	/** Who may read it: the whole team, or (`restricted`) its adder, these members, owners and admins. */
	setAccess: ({
		id,
		access,
		userIds,
	}: DocumentAccessInput): Promise<{ access: DocumentAccess; sharedWith: string[] }> =>
		api(endpoints.documents.access(id), {
			method: "PUT",
			body: { access, userIds },
			schema: documentAccessResultSchema,
		}),

	/** Deletes the document and its chunks at once (no approval, unlike deleting all). */
	remove: (id: string): Promise<unknown> =>
		api(endpoints.documents.detail(id), { method: "DELETE", schema: z.unknown() }),
};
