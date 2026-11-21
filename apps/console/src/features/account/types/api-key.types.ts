import type { z } from "zod";

import type { apiKeySchema, createdApiKeySchema } from "../schemas/api-key.schema";

export type ApiKey = z.infer<typeof apiKeySchema>;
export type CreatedApiKey = z.infer<typeof createdApiKeySchema>;
