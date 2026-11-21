"use client";

import { Button } from "@synapse/ui/components/button";
import { type FormEvent, useState } from "react";

import { AuthCard } from "@/components/shared/auth-card";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { validateForm } from "@/lib/forms/validate-form";

import { signInCodeFormSchema } from "../schemas/auth.schema";
import { FormMessage } from "./form-message";

export type SignInCodeFormProps = {
	onSubmit: (code: string) => void;
	/** Back to the password step (e.g. the challenge expired). */
	onStartOver: () => void;
	pending: boolean;
	error: string | null;
};

/** Two-step sign-in: the 6-digit code from the authenticator app, or a recovery code. */
export function SignInCodeForm({ onSubmit, onStartOver, pending, error }: SignInCodeFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [recovery, setRecovery] = useState(false);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(signInCodeFormSchema, event.currentTarget, ["code"]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSubmit(result.data.code);
	}

	return (
		<AuthCard
			title="Two-step sign-in"
			description={
				recovery
					? "Enter one of the recovery codes you saved when you turned two-step sign-in on. Each works once."
					: "Enter the 6-digit code from your authenticator app."
			}
		>
			<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
				<FormField
					key={recovery ? "recovery" : "code"}
					name="code"
					label={recovery ? "Recovery code" : "Authentication code"}
					autoComplete="one-time-code"
					{...(recovery ? {} : { inputMode: "numeric" as const, pattern: "[0-9 ]*" })}
					autoFocus
					error={errors.code}
				/>
				<FormMessage error={error} />
				<SubmitButton disabled={pending}>{pending ? "Checking…" : "Continue"}</SubmitButton>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto px-0 text-muted-foreground"
						onClick={() => setRecovery(!recovery)}
					>
						{recovery ? "Use the authenticator app" : "Use a recovery code"}
					</Button>
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto px-0 text-muted-foreground"
						onClick={onStartOver}
					>
						Start over
					</Button>
				</div>
			</form>
		</AuthCard>
	);
}
