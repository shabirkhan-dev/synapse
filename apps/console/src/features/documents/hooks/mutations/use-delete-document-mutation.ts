import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

export function useDeleteDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: documentsService.remove,
		onSuccess: (_deleted, id) => {
			queryClient.removeQueries({ queryKey: ["documents", id] });
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
				queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
			]);
		},
	});
}
