"use client";

import { Button } from "@synapse/ui/components/button";
import { type FormEvent, useState } from "react";

import { AuthCard } from "@/components/shared/auth-card";
import { FormField } from "@/components/shared/form-field";
import { validateForm } from "@/lib/forms/validate-form";

import { signInFormSchema } from "../schemas/auth.schema";
import type { SignInInput } from "../types/auth.types";
import { AuthLinks } from "./auth-links";
import { FormMessage } from "./form-message";

export type SignInFormProps = {
	onSubmit: (input: SignInInput) => void;
	pending: boolean;
	/** A message from the API (e.g. wrong password), shown above the button. */
	error: string | null;
};

/** Email + password, validated with Zod before `onSubmit`. */
export function SignInForm({ onSubmit, pending, error }: SignInFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(signInFormSchema, event.currentTarget, ["email", "password"]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSubmit(result.data);
	}

	return (
		<AuthCard
			title="Sign in to Synapse"
			description="Use the email and password of your Synapse account."
			footer={<AuthLinks show={["signUp", "forgot"]} />}
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
					autoComplete="current-password"
					error={errors.password}
				/>
				<FormMessage error={error} />
				<Button type="submit" disabled={pending}>
					{pending ? "Signing in…" : "Sign in"}
				</Button>
			</form>
		</AuthCard>
	);
}
