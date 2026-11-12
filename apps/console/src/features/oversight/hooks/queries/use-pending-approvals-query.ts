import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { oversightService } from "../../services/oversight.service";

export function usePendingApprovalsQuery() {
	return useQuery({ queryKey: queryKeys.approvals.pending, queryFn: oversightService.listPending });
}
