import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { playgroundService } from "../../services/playground.service";

/** An answer is recorded with its provenance: usage and activity change with it. */
export function useAskQuestionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: playgroundService.ask,
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.usage.all }),
				queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
			]),
	});
}
