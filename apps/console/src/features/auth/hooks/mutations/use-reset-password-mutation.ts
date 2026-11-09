import { useMutation } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

export function useResetPasswordMutation() {
	return useMutation({ mutationFn: authService.resetPassword });
}
