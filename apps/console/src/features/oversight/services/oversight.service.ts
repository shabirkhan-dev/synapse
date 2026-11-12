import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import {
	approvalListSchema,
	approvalSchema,
	decisionResultSchema,
} from "../schemas/approval.schema";
import type { Approval, DecisionResult } from "../types/approval.types";

export const oversightService = {
	/** Admins and owners see every pending request of the organization; members their own. */
	listPending: (): Promise<Approval[]> =>
		api(endpoints.oversight.approvals, { schema: approvalListSchema }),

	/** The paused action runs now; the result says what it did. */
	approve: (id: string): Promise<DecisionResult> =>
		api(endpoints.oversight.approve(id), {
			method: "POST",
			body: {},
			schema: decisionResultSchema,
		}),

	reject: ({ id, reason }: { id: string; reason?: string | undefined }): Promise<DecisionResult> =>
		api(endpoints.oversight.reject(id), {
			method: "POST",
			body: reason ? { reason } : {},
			schema: decisionResultSchema,
		}),

	/** Asks to delete every document; nothing is deleted until someone approves. */
	requestPurge: (): Promise<Approval> =>
		api(endpoints.documents.purge, { method: "POST", schema: approvalSchema }),
};
