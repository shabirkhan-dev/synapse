import { useMutation } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

export function useRequestPasswordResetMutation() {
	return useMutation({ mutationFn: authService.requestPasswordReset });
}
