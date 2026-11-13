import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { agentsService } from "../../services/agents.service";

export function useAgentRunsQuery() {
	return useQuery({ queryKey: queryKeys.agents.runs, queryFn: agentsService.runs });
}
