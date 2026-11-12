import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { organizationsService } from "../../services/organizations.service";

export function useRemoveMemberMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: organizationsService.removeMember,
		onSuccess: (_removed, { organizationId }) =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizations.members(organizationId),
			}),
	});
}
