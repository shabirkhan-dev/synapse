import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { organizationsService } from "../../services/organizations.service";

/** The API answers with the members after the change. */
export function useSaveMemberMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: organizationsService.saveMember,
		onSuccess: (members, { organizationId }) =>
			queryClient.setQueryData(queryKeys.organizations.members(organizationId), members),
	});
}
