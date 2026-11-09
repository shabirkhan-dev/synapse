"use client";

import { Button } from "@synapse/ui/components/button";
import { type FormEvent, useState } from "react";

import { AuthCard } from "@/components/shared/auth-card";
import { FormField } from "@/components/shared/form-field";
import { validateForm } from "@/lib/forms/validate-form";

import { PASSWORD_RULES } from "../constants/auth.constants";
import { signUpFormSchema } from "../schemas/auth.schema";
import type { SignUpInput } from "../types/auth.types";
import { AuthLinks } from "./auth-links";
import { FormMessage } from "./form-message";

export type SignUpFormProps = {
	onSubmit: (input: SignUpInput) => void;
	pending: boolean;
	error: string | null;
};

export function SignUpForm({ onSubmit, pending, error }: SignUpFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(signUpFormSchema, event.currentTarget, [
			"email",
			"password",
			"confirm",
		]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSubmit(result.data);
	}

	return (
		<AuthCard
			title="Create your Synapse account"
			description={`We will email you a link to verify the address. Passwords need ${PASSWORD_RULES.MIN}+ characters.`}
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
				<FormField
					name="password"
					label="Password"
					type="password"
					autoComplete="new-password"
					error={errors.password}
				/>
				<FormField
					name="confirm"
					label="Repeat the password"
					type="password"
					autoComplete="new-password"
					error={errors.confirm}
				/>
				<FormMessage error={error} />
				<Button type="submit" disabled={pending}>
					{pending ? "Creating your account…" : "Create account"}
				</Button>
			</form>
		</AuthCard>
	);
}
