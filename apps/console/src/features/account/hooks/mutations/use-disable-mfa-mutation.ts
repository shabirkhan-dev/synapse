import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useDisableMfaMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: accountService.disableMfa,
		onSuccess: (status) => queryClient.setQueryData(queryKeys.mfa, status),
	});
}
