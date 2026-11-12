import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { organizationsService } from "../../services/organizations.service";

export function useOrganizationsQuery() {
	return useQuery({ queryKey: queryKeys.organizations.all, queryFn: organizationsService.list });
}
