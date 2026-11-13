import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { evaluationsService } from "../../services/evaluations.service";

export function useAddEvalQuestionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: evaluationsService.addQuestion,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.questions }),
	});
}
