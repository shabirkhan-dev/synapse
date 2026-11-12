import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { organizationsService } from "../../services/organizations.service";

/** Members of a team; idle until there is one (personal organizations have only you). */
export function useMembersQuery(organizationId: string | null) {
	return useQuery({
		queryKey: queryKeys.organizations.members(organizationId ?? ""),
		queryFn: () => organizationsService.members(organizationId ?? ""),
		enabled: organizationId !== null,
	});
}
