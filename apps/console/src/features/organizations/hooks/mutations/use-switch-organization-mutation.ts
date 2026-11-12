import { useMutation, useQueryClient } from "@tanstack/react-query";

import { organizationsService } from "../../services/organizations.service";

/** Every cached answer belonged to the old organization: drop them all and refetch what is shown. */
export function useSwitchOrganizationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: organizationsService.switchTo,
		onSuccess: () => queryClient.resetQueries(),
	});
}
