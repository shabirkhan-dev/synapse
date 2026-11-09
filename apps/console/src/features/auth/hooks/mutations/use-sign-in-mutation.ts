import { useMutation } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

export function useSignInMutation() {
	return useMutation({ mutationFn: authService.signIn });
}
