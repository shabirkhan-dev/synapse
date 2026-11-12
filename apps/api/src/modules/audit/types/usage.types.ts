import type { z } from "@hono/zod-openapi";

import type { usageSchema } from "../schemas/audit.schemas";

export type Usage = z.infer<typeof usageSchema>;
