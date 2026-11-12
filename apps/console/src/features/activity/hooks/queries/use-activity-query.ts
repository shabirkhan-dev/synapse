import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { activityService } from "../../services/activity.service";

export function useActivityQuery(limit: number) {
	return useQuery({
		queryKey: queryKeys.activity.list(limit),
		queryFn: () => activityService.list(limit),
	});
}
