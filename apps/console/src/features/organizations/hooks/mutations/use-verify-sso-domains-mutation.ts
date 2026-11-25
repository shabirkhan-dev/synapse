import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { ssoService } from "../../services/sso.service";

export function useVerifySsoDomainsMutation(organizationId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ssoService.verify,
		onSuccess: (checked) =>
			queryClient.setQueryData(queryKeys.organizations.sso(organizationId), checked),
	});
}
