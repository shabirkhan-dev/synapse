import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { oversightService } from "../../services/oversight.service";

export function useRejectRequestMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: oversightService.reject,
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending }),
				queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
			]),
	});
}
