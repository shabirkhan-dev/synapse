"use client";

import { ForgotPasswordForm } from "../components/forgot-password-form";
import { useRequestPasswordResetMutation } from "../hooks/mutations/use-request-password-reset-mutation";

export function ForgotPasswordContainer() {
	const request = useRequestPasswordResetMutation();
	return (
		<ForgotPasswordForm
			pending={request.isPending}
			error={request.error ? request.error.message : null}
			sent={request.isSuccess}
			onSubmit={(input) => request.mutate(input)}
		/>
	);
}
