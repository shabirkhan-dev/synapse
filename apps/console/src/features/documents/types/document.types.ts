import type { z } from "zod";

import type {
	chunkSchema,
	documentDetailSchema,
	documentSchema,
	ingestDocumentFormSchema,
} from "../schemas/document.schema";

export type DocumentSummary = z.infer<typeof documentSchema>;
export type IngestDocumentInput = z.output<typeof ingestDocumentFormSchema>;
export type DocumentDetail = z.infer<typeof documentDetailSchema>;
export type DocumentChunk = z.infer<typeof chunkSchema>;
