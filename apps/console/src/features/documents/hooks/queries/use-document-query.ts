import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

/** One page of a document's chunks; the previous page stays on screen while the next loads. */
export function useDocumentQuery(id: string, offset: number) {
	return useQuery({
		queryKey: queryKeys.documents.detail(id, offset),
		queryFn: () => documentsService.detail(id, offset),
		placeholderData: keepPreviousData,
	});
}
