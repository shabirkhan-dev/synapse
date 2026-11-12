import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { oversightService } from "../../services/oversight.service";

export function useRequestPurgeMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: oversightService.requestPurge,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending }),
	});
}
