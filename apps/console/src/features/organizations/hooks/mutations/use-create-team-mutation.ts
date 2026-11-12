import { useMutation, useQueryClient } from "@tanstack/react-query";

import { organizationsService } from "../../services/organizations.service";

/** The new team becomes the active organization, so every cached answer is dropped. */
export function useCreateTeamMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: organizationsService.createTeam,
		onSuccess: () => queryClient.resetQueries(),
	});
}
