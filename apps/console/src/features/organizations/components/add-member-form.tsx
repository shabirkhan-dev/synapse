"use client";

import { type FormEvent, useState } from "react";

import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import type { OrganizationRole } from "@/lib/permissions";
import { validateForm } from "@/lib/forms/validate-form";

import { addMemberFormSchema } from "../schemas/organization.schema";
import type { AddMemberInput } from "../types/organization.types";
import { RoleSelect } from "./role-select";

export type AddMemberFormProps = {
	/** Roles the caller may give. */
	roles: ReadonlyArray<OrganizationRole>;
	pending: boolean;
	/** Resolves when saved; the form clears itself then. */
	onAdd: (input: AddMemberInput) => Promise<unknown>;
};

/** Add an existing account by email (they must have signed up). */
export function AddMemberForm({ roles, pending, onAdd }: AddMemberFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});
	// `form.reset()` does not reach the role picker's state: remount it so the role goes back to
	// "member" instead of silently reusing the last (possibly admin) choice.
	const [added, setAdded] = useState(0);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const result = validateForm(addMemberFormSchema, form, ["email", "role"]);
		setErrors(result.success ? {} : result.errors);
		if (!result.success) return;
		try {
			await onAdd(result.data);
			form.reset();
			setAdded((count) => count + 1);
		} catch {
			// The container shows the API's message; keep the email so it can be corrected.
		}
	}

	return (
		<form className="flex flex-wrap items-end gap-2" onSubmit={handleSubmit} noValidate>
			<div className="min-w-56 flex-1">
				<FormField
					name="email"
					label="Email"
					type="email"
					autoComplete="off"
					error={errors.email}
				/>
			</div>
			<RoleSelect key={added} label="Role" name="role" roles={roles} defaultValue="member" />
			<SubmitButton disabled={pending}>{pending ? "Adding…" : "Add member"}</SubmitButton>
		</form>
	);
}
