import { useMutation } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

export function useCompleteSsoMutation() {
	return useMutation({ mutationFn: authService.completeSso });
}
