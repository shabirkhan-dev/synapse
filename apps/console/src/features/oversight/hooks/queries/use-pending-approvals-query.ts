import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { oversightService } from "../../services/oversight.service";

/** Approval requests change from other people's sessions, so a cached list is never trusted for long. */
const PENDING_REFRESH_MS = 60_000;

export function usePendingApprovalsQuery() {
	return useQuery({
		queryKey: queryKeys.approvals.pending,
		queryFn: oversightService.listPending,
		// The sidebar count keeps the list cached; opening Approvals must still show what is new.
		refetchOnMount: "always",
		refetchInterval: PENDING_REFRESH_MS,
	});
}
