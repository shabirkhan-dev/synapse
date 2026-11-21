import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

export function useCreateApiKeyMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: accountService.createApiKey,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
	});
}
