import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../../services/chat.service";

/** Conversations whose title contains `q`; idle below two characters. */
export function useConversationSearchQuery(q: string) {
	return useQuery({
		queryKey: queryKeys.conversations.search(q),
		queryFn: () => chatService.search(q),
		enabled: q.length >= 2,
	});
}
