"use client";

import { type FormEvent, useState } from "react";

import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { validateForm } from "@/lib/forms/validate-form";

import { PASSAGES_DEFAULT, PASSAGES_MAX } from "../constants/retrieval.constants";
import { compareFormSchema } from "../schemas/retrieval.schema";
import type { CompareInput } from "../types/retrieval.types";

export type CompareFormProps = {
	pending: boolean;
	onCompare: (input: CompareInput) => void;
};

/** What to search for and how many passages each mode returns. */
export function CompareForm({ pending, onCompare }: CompareFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(compareFormSchema, event.currentTarget, ["query", "topK"]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onCompare(result.data);
	}

	return (
		<form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit} noValidate>
			<div className="min-w-64 flex-1">
				<FormField
					name="query"
					label="Search for"
					placeholder="refund within 30 days"
					autoComplete="off"
					error={errors.query}
				/>
			</div>
			<div className="w-32">
				<FormField
					name="topK"
					label="Passages per mode"
					type="number"
					inputMode="numeric"
					min={1}
					max={PASSAGES_MAX}
					defaultValue={PASSAGES_DEFAULT}
					error={errors.topK}
				/>
			</div>
			<SubmitButton disabled={pending}>{pending ? "Searching…" : "Compare"}</SubmitButton>
		</form>
	);
}
