import type { z } from "zod";

import type { auditEventSchema } from "../schemas/activity.schema";

export type AuditEvent = z.infer<typeof auditEventSchema>;
