import { useMutation } from "@tanstack/react-query";

import { accountService } from "../../services/account.service";

export function useSetupMfaMutation() {
	return useMutation({ mutationFn: accountService.setupMfa });
}
