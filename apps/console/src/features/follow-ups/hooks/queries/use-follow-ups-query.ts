import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { followUpsService } from "../../services/follow-ups.service";

/** Suggestions for one answer; only asked once the answer is complete. */
export function useFollowUpsQuery(input: { question: string; answer: string } | null) {
	return useQuery({
		queryKey: queryKeys.followUps(input?.question ?? "", input?.answer ?? ""),
		queryFn: () => followUpsService.suggest(input as { question: string; answer: string }),
		enabled: input !== null,
		staleTime: Number.POSITIVE_INFINITY,
		// Suggestions are a nicety: a failure shows nothing rather than retrying a model call.
		retry: false,
	});
}
