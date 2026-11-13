import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

export function useUploadDocumentMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: documentsService.upload,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
	});
}
