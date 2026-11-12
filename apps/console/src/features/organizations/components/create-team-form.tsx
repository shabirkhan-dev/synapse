"use client";

import { type FormEvent, useState } from "react";

import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { validateForm } from "@/lib/forms/validate-form";

import { createTeamFormSchema } from "../schemas/organization.schema";

export type CreateTeamFormProps = {
	pending: boolean;
	/** Resolves when the team exists; the form clears itself then. */
	onCreate: (name: string) => Promise<unknown>;
};

export function CreateTeamForm({ pending, onCreate }: CreateTeamFormProps) {
	const [error, setError] = useState<string | undefined>();

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const result = validateForm(createTeamFormSchema, form, ["name"]);
		setError(result.success ? undefined : result.errors.name);
		if (!result.success) return;
		try {
			await onCreate(result.data.name);
			form.reset();
		} catch {
			// The container shows the API's message.
		}
	}

	return (
		<form className="flex flex-wrap items-end gap-2" onSubmit={handleSubmit} noValidate>
			<div className="min-w-56 flex-1">
				<FormField name="name" label="Team name" autoComplete="off" error={error} />
			</div>
			<SubmitButton disabled={pending}>{pending ? "Creating…" : "Create team"}</SubmitButton>
		</form>
	);
}
