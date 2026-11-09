import { useMutation } from "@tanstack/react-query";

import { playgroundService } from "../../services/playground.service";

export function useSendFeedbackMutation() {
	return useMutation({ mutationFn: playgroundService.sendFeedback });
}
