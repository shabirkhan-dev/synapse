import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

/** Change who reads a document; refreshes the list and the document's page. */
export function useSetDocumentAccessMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: documentsService.setAccess,
		onSuccess: (_result, { id }) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
				queryClient.invalidateQueries({ queryKey: ["documents", id] }),
			]),
	});
}
