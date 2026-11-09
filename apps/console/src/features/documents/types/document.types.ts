import type { z } from "zod";

import type { documentSchema, ingestDocumentFormSchema } from "../schemas/document.schema";

export type DocumentSummary = z.infer<typeof documentSchema>;
export type IngestDocumentInput = z.output<typeof ingestDocumentFormSchema>;
