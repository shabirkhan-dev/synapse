import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { evaluationsService } from "../../services/evaluations.service";

/** The finished run is put in the cache, so showing it needs no second request. */
export function useRunEvaluationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: evaluationsService.run,
		onSuccess: (run) => {
			queryClient.setQueryData(queryKeys.evaluations.run(run.id), run);
			return queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.runs });
		},
	});
}
