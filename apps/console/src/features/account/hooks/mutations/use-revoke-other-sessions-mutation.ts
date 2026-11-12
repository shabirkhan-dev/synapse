import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useRevokeOtherSessionsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: accountService.revokeOtherSessions,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions }),
	});
}
