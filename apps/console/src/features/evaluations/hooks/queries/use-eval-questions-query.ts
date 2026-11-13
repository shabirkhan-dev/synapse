import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { evaluationsService } from "../../services/evaluations.service";

export function useEvalQuestionsQuery() {
	return useQuery({
		queryKey: queryKeys.evaluations.questions,
		queryFn: evaluationsService.questions,
	});
}
