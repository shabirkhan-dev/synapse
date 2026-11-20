import type { z } from "zod";

import type {
	chunkSchema,
	documentAccessSchema,
	documentDetailSchema,
	documentSchema,
	ingestDocumentFormSchema,
	uploadDocumentFormSchema,
	webPageFormSchema,
} from "../schemas/document.schema";

export type DocumentSummary = z.infer<typeof documentSchema>;
export type IngestDocumentInput = z.output<typeof ingestDocumentFormSchema>;
export type UploadDocumentInput = z.output<typeof uploadDocumentFormSchema>;
export type WebPageInput = z.output<typeof webPageFormSchema>;
export type DocumentDetail = z.infer<typeof documentDetailSchema>;
export type DocumentChunk = z.infer<typeof chunkSchema>;
export type DocumentAccess = z.infer<typeof documentAccessSchema>;
/** What a document is added with: everyone in the team, or only its adder until shared. */
export type WithAccess<T> = T & { access?: DocumentAccess };
export type DocumentAccessInput = { id: string; access: DocumentAccess; userIds: string[] };
