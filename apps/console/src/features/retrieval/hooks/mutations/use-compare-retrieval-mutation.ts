import { useMutation } from "@tanstack/react-query";

import { retrievalService } from "../../services/retrieval.service";

export function useCompareRetrievalMutation() {
	return useMutation({ mutationFn: retrievalService.compare });
}
