import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { organizationsService } from "../../services/organizations.service";

/** A team's pending invitations; idle unless the caller may manage members there. */
export function useInvitationsQuery(organizationId: string | null) {
	return useQuery({
		queryKey: queryKeys.organizations.invitations(organizationId ?? ""),
		queryFn: () => organizationsService.invitations(organizationId ?? ""),
		enabled: organizationId !== null,
	});
}
