"use client";

import { Alert, AlertDescription } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import { Input } from "@synapse/ui/components/input";
import { Label } from "@synapse/ui/components/label";
import { type FormEvent, useState } from "react";

import { signInFormSchema } from "../schemas/auth.schema";
import type { SignInInput } from "../types/auth.types";

export type SignInFormProps = {
	onSubmit: (input: SignInInput) => void;
	pending: boolean;
	/** A message from the API (e.g. wrong password), shown above the button. */
	error: string | null;
};

type FieldErrors = Partial<Record<keyof SignInInput, string>>;

/** Email + password, validated with Zod before `onSubmit`. */
export function SignInForm({ onSubmit, pending, error }: SignInFormProps) {
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const parsed = signInFormSchema.safeParse({
			email: form.get("email"),
			password: form.get("password"),
		});
		if (!parsed.success) {
			const errors: FieldErrors = {};
			for (const issue of parsed.error.issues) {
				const field = issue.path[0] as keyof SignInInput;
				errors[field] ??= issue.message;
			}
			setFieldErrors(errors);
			return;
		}
		setFieldErrors({});
		onSubmit(parsed.data);
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Sign in to Synapse</CardTitle>
				<CardDescription>Use the email and password of your Synapse account.</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							aria-invalid={fieldErrors.email ? true : undefined}
							aria-describedby={fieldErrors.email ? "email-error" : undefined}
						/>
						{fieldErrors.email ? (
							<p id="email-error" className="text-xs text-destructive">
								{fieldErrors.email}
							</p>
						) : null}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							autoComplete="current-password"
							aria-invalid={fieldErrors.password ? true : undefined}
							aria-describedby={fieldErrors.password ? "password-error" : undefined}
						/>
						{fieldErrors.password ? (
							<p id="password-error" className="text-xs text-destructive">
								{fieldErrors.password}
							</p>
						) : null}
					</div>
					{error ? (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}
					<Button type="submit" disabled={pending}>
						{pending ? "Signing in…" : "Sign in"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
