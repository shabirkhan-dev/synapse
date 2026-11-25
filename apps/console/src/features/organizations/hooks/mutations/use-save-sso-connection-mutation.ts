import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { ssoService } from "../../services/sso.service";

export function useSaveSsoConnectionMutation(organizationId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ssoService.save,
		onSuccess: (saved) =>
			queryClient.setQueryData(queryKeys.organizations.sso(organizationId), saved),
	});
}
