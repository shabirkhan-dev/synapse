import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { auditEventListSchema } from "../schemas/activity.schema";
import type { AuditEvent } from "../types/activity.types";

export const activityService = {
	/** Newest first. Admins and owners see the organization's history; members their own. */
	list: (limit: number): Promise<AuditEvent[]> =>
		api(`${endpoints.audit.events}?limit=${limit}`, { schema: auditEventListSchema }),
};
