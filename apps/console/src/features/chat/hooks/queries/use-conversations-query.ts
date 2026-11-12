import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../../services/chat.service";

export function useConversationsQuery() {
	return useQuery({ queryKey: queryKeys.conversations.all, queryFn: chatService.list });
}
