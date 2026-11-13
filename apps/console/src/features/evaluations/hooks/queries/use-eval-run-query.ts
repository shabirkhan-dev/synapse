import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { evaluationsService } from "../../services/evaluations.service";

/** One run with its per-question ranks; idle until a run is chosen. */
export function useEvalRunQuery(id: string | null) {
	return useQuery({
		queryKey: queryKeys.evaluations.run(id ?? ""),
		queryFn: () => evaluationsService.runDetail(id ?? ""),
		enabled: id !== null,
	});
}
