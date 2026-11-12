"use client";

import { type FormEvent, useState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";
import { AuthCard } from "@/components/shared/auth-card";
import { FormField } from "@/components/shared/form-field";
import { validateForm } from "@/lib/forms/validate-form";

import { forgotPasswordFormSchema } from "../schemas/auth.schema";
import type { ForgotPasswordInput } from "../types/auth.types";
import { AuthLinks } from "./auth-links";
import { FormMessage } from "./form-message";

export type ForgotPasswordFormProps = {
	onSubmit: (input: ForgotPasswordInput) => void;
	pending: boolean;
	error: string | null;
	/** After a request: the same message whether or not the address has an account. */
	sent: boolean;
};

export function ForgotPasswordForm({ onSubmit, pending, error, sent }: ForgotPasswordFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(forgotPasswordFormSchema, event.currentTarget, ["email"]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSubmit(result.data);
	}

	return (
		<AuthCard
			title="Reset your password"
			description="Enter your account's email and we will send you a link to choose a new password."
			footer={<AuthLinks show={["signIn"]} />}
		>
			<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
				<FormField
					name="email"
					label="Email"
					type="email"
					autoComplete="email"
					error={errors.email}
				/>
				<FormMessage
					error={error}
					success={
						sent
							? "If that address has an account, a reset link is on its way. It works for one hour."
							: null
					}
				/>
				<SubmitButton disabled={pending}>
					{pending ? "Sending…" : sent ? "Send another link" : "Send reset link"}
				</SubmitButton>
			</form>
		</AuthCard>
	);
}
