"use client";

import { ResetPasswordForm } from "../components/reset-password-form";
import { useResetPasswordMutation } from "../hooks/mutations/use-reset-password-mutation";
import { useLinkToken } from "../hooks/use-link-token";

/** `/reset-password?token=…` from the emailed link. */
export function ResetPasswordContainer({ token }: { token: string | null }) {
	const reset = useResetPasswordMutation();
	useLinkToken(token);
	return (
		<ResetPasswordForm
			pending={reset.isPending}
			error={reset.error ? reset.error.message : null}
			done={reset.isSuccess}
			missingToken={!token}
			onSubmit={(password) => {
				if (token) reset.mutate({ token, password, confirm: password });
			}}
		/>
	);
}
