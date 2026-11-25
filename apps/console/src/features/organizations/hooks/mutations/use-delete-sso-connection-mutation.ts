import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { ssoService } from "../../services/sso.service";

export function useDeleteSsoConnectionMutation(organizationId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ssoService.remove,
		onSuccess: () => queryClient.setQueryData(queryKeys.organizations.sso(organizationId), null),
	});
}
