import { useMutation } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

export function useCompleteSignInMutation() {
	return useMutation({ mutationFn: authService.completeSignIn });
}
