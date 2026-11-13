import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { evaluationsService } from "../../services/evaluations.service";

export function useDeleteEvalQuestionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: evaluationsService.removeQuestion,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.questions }),
	});
}
