"use client";

import { usePendingApprovalsQuery } from "../hooks/queries/use-pending-approvals-query";

/** How many requests wait for a decision, for the sidebar; nothing while none do. */
export function PendingApprovalsBadge() {
	const pending = usePendingApprovalsQuery();
	const count = pending.data?.length ?? 0;
	if (count === 0) return null;
	return (
		<>
			<span aria-hidden="true">{count}</span>
			<span className="sr-only">
				{count === 1 ? "1 request waiting" : `${count} requests waiting`}
			</span>
		</>
	);
}
