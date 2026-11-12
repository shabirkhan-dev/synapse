import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useRevokeSessionMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: accountService.revokeSession,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions }),
	});
}
