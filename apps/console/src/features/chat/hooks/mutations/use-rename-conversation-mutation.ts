import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../../services/chat.service";

export function useRenameConversationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: chatService.rename,
		// Only the list: the open thread owns its messages (a refetch would rewind them).
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all, exact: true }),
	});
}
