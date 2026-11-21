import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useMfaStatusQuery() {
	return useQuery({ queryKey: queryKeys.mfa, queryFn: accountService.mfaStatus });
}
