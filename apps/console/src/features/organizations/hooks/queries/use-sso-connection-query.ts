import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { ssoService } from "../../services/sso.service";

/** The active team's single sign-on; idle unless the caller may see it (admins and owners). */
export function useSsoConnectionQuery(organizationId: string | null) {
	return useQuery({
		queryKey: queryKeys.organizations.sso(organizationId ?? ""),
		queryFn: ssoService.connection,
		enabled: organizationId !== null,
	});
}
