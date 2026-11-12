import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { usageService } from "../../services/usage.service";

/** The previous range stays on screen while another loads. */
export function useUsageQuery(days: number) {
	return useQuery({
		queryKey: queryKeys.usage.range(days),
		queryFn: () => usageService.summary(days),
		placeholderData: keepPreviousData,
	});
}
