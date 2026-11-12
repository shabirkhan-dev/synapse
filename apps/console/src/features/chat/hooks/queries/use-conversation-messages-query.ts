import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../../services/chat.service";

/** The history of an opened conversation; idle for a new chat. */
export function useConversationMessagesQuery(id: string | null) {
	return useQuery({
		queryKey: queryKeys.conversations.detail(id ?? ""),
		queryFn: () => chatService.messages(id ?? ""),
		enabled: id !== null,
		// The thread owns the live messages once it is open; a refetch would only rewind them.
		staleTime: Number.POSITIVE_INFINITY,
	});
}
