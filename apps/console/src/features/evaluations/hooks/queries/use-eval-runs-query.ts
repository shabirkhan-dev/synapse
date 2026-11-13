import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { evaluationsService } from "../../services/evaluations.service";

export function useEvalRunsQuery() {
	return useQuery({ queryKey: queryKeys.evaluations.runs, queryFn: evaluationsService.runs });
}
