import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { organizationsService } from "../../services/organizations.service";

export function useRevokeInvitationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: organizationsService.revokeInvitation,
		onSuccess: (_removed, { organizationId }) =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.invitations(organizationId),
			}),
	});
}
