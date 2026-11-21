import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useEnableMfaMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: accountService.enableMfa,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.mfa }),
	});
}
