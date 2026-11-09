import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/api-error";

/** One client per browser tab (a fresh one per server render). */
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				// 4xx answers will not change on a retry (e.g. 401 after a failed refresh).
				retry: (failures, error) =>
					!(error instanceof ApiError && error.status < 500) && failures < 2,
			},
		},
	});
}
