import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useSessionsQuery() {
	return useQuery({ queryKey: queryKeys.sessions, queryFn: accountService.sessions });
}
