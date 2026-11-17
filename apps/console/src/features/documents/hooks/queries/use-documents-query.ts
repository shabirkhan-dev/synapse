import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

/** `enabled: false` waits until it is needed (e.g. the command palette opens). */
export function useDocumentsQuery({ enabled = true }: { enabled?: boolean } = {}) {
	return useQuery({ queryKey: queryKeys.documents.all, queryFn: documentsService.list, enabled });
}
