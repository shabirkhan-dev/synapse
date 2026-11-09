import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

/** Signs out and drops every cached query (the next user must not see this user's data). */
export function useSignOutMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: authService.signOut,
		onSettled: () => queryClient.clear(),
	});
}
