import { useMutation } from "@tanstack/react-query";

import { authService } from "../../services/auth.service";

export function useStartSsoMutation() {
	return useMutation({ mutationFn: authService.startSso });
}
