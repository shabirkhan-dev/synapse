import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { accountService } from "../../services/account.service";

/** Refetches the user too: if the email was verified meanwhile, the page should say so. */
export function useResendVerificationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: accountService.resendVerification,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.currentUser }),
	});
}
