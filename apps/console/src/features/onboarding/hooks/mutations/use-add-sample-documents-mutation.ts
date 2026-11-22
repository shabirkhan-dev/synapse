import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/query-keys";

import { onboardingService } from "../../services/onboarding.service";

export function useAddSampleDocumentsMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: onboardingService.addSampleDocuments,
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
	});
}
