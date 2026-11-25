"use client";

import { type FormEvent, useState } from "react";

import { AuthCard } from "@/components/shared/auth-card";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { validateForm } from "@/lib/forms/validate-form";

import { ssoFormSchema } from "../schemas/auth.schema";
import { AuthLinks } from "./auth-links";
import { FormMessage } from "./form-message";

export type SsoFormProps = {
	onSubmit: (email: string) => void;
	/** Also while the browser leaves for the identity provider. */
	pending: boolean;
	error: string | null;
};

/** Work email first: its domain picks the team's identity provider. */
export function SsoForm({ onSubmit, pending, error }: SsoFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(ssoFormSchema, event.currentTarget, ["email"]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSubmit(result.data.email);
	}

	return (
		<AuthCard
			title="Sign in with single sign-on"
			description="Enter your work email; your company's sign-in page opens next."
			footer={<AuthLinks show={["signIn"]} />}
		>
			<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
				<FormField
					name="email"
					label="Work email"
					type="email"
					autoComplete="email"
					error={errors.email}
				/>
				<FormMessage error={error} />
				<SubmitButton disabled={pending}>{pending ? "Opening…" : "Continue"}</SubmitButton>
			</form>
		</AuthCard>
	);
}
