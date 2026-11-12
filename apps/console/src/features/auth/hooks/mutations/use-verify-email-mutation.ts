import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { authService } from "../../services/auth.service";

/** A verified email changes the signed-in user (the "verify your email" notice goes away). */
export function useVerifyEmailMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: authService.verifyEmail,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.currentUser }),
	});
}
