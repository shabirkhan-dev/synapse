import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../../services/chat.service";

/** `enabled: false` waits until it is needed (e.g. the command palette opens). */
export function useConversationsQuery({ enabled = true }: { enabled?: boolean } = {}) {
	return useQuery({ queryKey: queryKeys.conversations.all, queryFn: chatService.list, enabled });
}
