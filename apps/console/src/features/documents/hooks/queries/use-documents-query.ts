import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { documentsService } from "../../services/documents.service";

/**
 * `enabled: false` waits until it is needed (e.g. the command palette opens). `fresh`: load the
 * latest list whenever the page opens, even if the sidebar's Recent group fetched it moments ago.
 */
export function useDocumentsQuery({
	enabled = true,
	fresh = false,
}: { enabled?: boolean; fresh?: boolean } = {}) {
	return useQuery({
		queryKey: queryKeys.documents.all,
		queryFn: documentsService.list,
		enabled,
		...(fresh ? { refetchOnMount: "always" as const } : {}),
	});
}
