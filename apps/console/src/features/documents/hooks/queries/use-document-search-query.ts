import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

/** Documents whose title contains `q`; idle below two characters. */
export function useDocumentSearchQuery(q: string) {
	return useQuery({
		queryKey: queryKeys.documents.search(q),
		queryFn: () => documentsService.search(q),
		enabled: q.length >= 2,
	});
}
