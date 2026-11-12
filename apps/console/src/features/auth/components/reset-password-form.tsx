"use client";

import { type FormEvent, useState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";
import { AuthCard } from "@/components/shared/auth-card";
import { LinkButton } from "@/components/shared/link-button";
import { FormField } from "@/components/shared/form-field";
import { validateForm } from "@/lib/forms/validate-form";

import { AUTH_ROUTES, PASSWORD_RULES } from "../constants/auth.constants";
import { resetPasswordFormSchema } from "../schemas/auth.schema";
import { AuthLinks } from "./auth-links";
import { FormMessage } from "./form-message";

export type ResetPasswordFormProps = {
	onSubmit: (password: string) => void;
	pending: boolean;
	error: string | null;
	done: boolean;
	/** The link had no token: nothing to submit. */
	missingToken: boolean;
};

export function ResetPasswordForm({
	onSubmit,
	pending,
	error,
	done,
	missingToken,
}: ResetPasswordFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(resetPasswordFormSchema, event.currentTarget, [
			"password",
			"confirm",
		]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSubmit(result.data.password);
	}

	if (done || missingToken) {
		return (
			<AuthCard
				title={done ? "Password changed" : "This link is incomplete"}
				description={
					done
						? "Sign in with your new password."
						: "Open the link from the email again, or ask for a new one."
				}
				footer={done ? undefined : <AuthLinks show={["forgot", "signIn"]} />}
			>
				{done ? (
					<LinkButton href={AUTH_ROUTES.SIGN_IN} className="w-full">
						Sign in
					</LinkButton>
				) : null}
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title="Choose a new password"
			description={`At least ${PASSWORD_RULES.MIN} characters. The link works once, for one hour.`}
			footer={<AuthLinks show={["forgot"]} />}
		>
			<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
				<FormField
					name="password"
					label="New password"
					type="password"
					autoComplete="new-password"
					error={errors.password}
				/>
				<FormField
					name="confirm"
					label="Repeat the new password"
					type="password"
					autoComplete="new-password"
					error={errors.confirm}
				/>
				<FormMessage error={error} />
				<SubmitButton disabled={pending}>{pending ? "Saving…" : "Save new password"}</SubmitButton>
			</form>
		</AuthCard>
	);
}
