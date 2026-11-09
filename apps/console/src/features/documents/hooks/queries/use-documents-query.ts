import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

export function useDocumentsQuery() {
	return useQuery({ queryKey: queryKeys.documents.all, queryFn: documentsService.list });
}
