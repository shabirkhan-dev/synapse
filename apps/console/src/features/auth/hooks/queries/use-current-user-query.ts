import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { authService } from "../../services/auth.service";

/** Who is signed in; other features use it to tell "you" from other people. */
export function useCurrentUserQuery({ enabled = true }: { enabled?: boolean } = {}) {
	return useQuery({
		queryKey: queryKeys.currentUser,
		queryFn: authService.currentUser,
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
	});
}
