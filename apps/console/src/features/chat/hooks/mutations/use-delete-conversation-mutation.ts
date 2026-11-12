import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../../services/chat.service";

export function useDeleteConversationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: chatService.remove,
		onSuccess: (_deleted, id) => {
			queryClient.removeQueries({ queryKey: queryKeys.conversations.detail(id) });
			return queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
		},
	});
}
