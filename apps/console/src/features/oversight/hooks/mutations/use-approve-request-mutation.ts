import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { oversightService } from "../../services/oversight.service";

/** The approved action may change anything it touches: refresh the lists that show it. */
export function useApproveRequestMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: oversightService.approve,
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending }),
				queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
				queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
			]),
	});
}
