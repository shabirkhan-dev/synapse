import type { z } from "zod";

import type { systemStatusSchema } from "../schemas/system.schema";

export type SystemStatus = z.infer<typeof systemStatusSchema>;
export type Circuit = SystemStatus["circuits"][number];
