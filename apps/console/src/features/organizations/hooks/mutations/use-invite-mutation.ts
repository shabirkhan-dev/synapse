import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { organizationsService } from "../../services/organizations.service";

export function useInviteMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: organizationsService.invite,
		onSuccess: (_invitation, { organizationId }) =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.invitations(organizationId),
			}),
	});
}
