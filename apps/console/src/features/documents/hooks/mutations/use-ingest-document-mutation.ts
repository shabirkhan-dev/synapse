import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

export function useIngestDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: documentsService.ingest,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
	});
}
