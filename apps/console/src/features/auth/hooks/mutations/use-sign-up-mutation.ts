import { useMutation } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

export function useSignUpMutation() {
	return useMutation({ mutationFn: authService.signUp });
}
