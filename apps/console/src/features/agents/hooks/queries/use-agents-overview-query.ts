import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { agentsService } from "../../services/agents.service";

/** Configuration changes only with a deploy, so it is not refetched in the background. */
export function useAgentsOverviewQuery() {
	return useQuery({
		queryKey: queryKeys.agents.overview,
		queryFn: agentsService.overview,
		staleTime: Number.POSITIVE_INFINITY,
	});
}
