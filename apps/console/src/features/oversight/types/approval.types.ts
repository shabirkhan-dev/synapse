import type { z } from "zod";

import type { approvalSchema, decisionResultSchema } from "../schemas/approval.schema";

export type Approval = z.infer<typeof approvalSchema>;
export type DecisionResult = z.infer<typeof decisionResultSchema>;
