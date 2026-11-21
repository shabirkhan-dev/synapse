import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useApiKeysQuery() {
	return useQuery({ queryKey: queryKeys.apiKeys, queryFn: accountService.apiKeys });
}
