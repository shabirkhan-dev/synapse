import { useMutation, useQueryClient } from "@tanstack/react-query";

import { organizationsService } from "../../services/organizations.service";

/** Joining switches into the team: every cached answer belonged to the old organization. */
export function useAcceptInvitationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: organizationsService.acceptInvitation,
		onSuccess: () => queryClient.resetQueries(),
	});
}
