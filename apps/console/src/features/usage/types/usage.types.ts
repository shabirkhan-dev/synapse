import type { z } from "zod";

import type { usageSchema } from "../schemas/usage.schema";

export type Usage = z.infer<typeof usageSchema>;
export type UsageDay = Usage["daily"][number];
export type UsageModel = Usage["models"][number];
