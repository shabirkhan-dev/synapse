import { useMutation } from "@tanstack/react-query";

import { playgroundService } from "../../services/playground.service";

export function useAskQuestionMutation() {
	return useMutation({ mutationFn: playgroundService.ask });
}
