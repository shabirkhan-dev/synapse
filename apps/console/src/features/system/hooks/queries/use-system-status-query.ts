import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { REFRESH_MS } from "../../constants/system.constants";
import { systemService } from "../../services/system.service";

/** Refreshed every 30 s while the page is open; a 403 is final, so it is not retried. */
export function useSystemStatusQuery() {
	return useQuery({
		queryKey: queryKeys.system.status,
		queryFn: systemService.status,
		refetchInterval: REFRESH_MS,
		retry: false,
	});
}
