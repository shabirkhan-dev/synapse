"use client";

import { Button } from "@synapse/ui/components/button";
import { Label } from "@synapse/ui/components/label";
import { Textarea } from "@synapse/ui/components/textarea";
import { type FormEvent, type KeyboardEvent, useState } from "react";

import { FormField } from "@/components/shared/form-field";
import { validateForm } from "@/lib/forms/validate-form";

import { PLAYGROUND_LIMITS } from "../constants/playground.constants";
import { questionFormSchema } from "../schemas/playground.schema";
import type { QuestionInput } from "../types/playground.types";

export type QuestionFormProps = {
	onSubmit: (input: QuestionInput) => void;
	pending: boolean;
};

/** The question and how many passages to retrieve. Ctrl/⌘ + Enter submits. */
export function QuestionForm({ onSubmit, pending }: QuestionFormProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	function submit(form: HTMLFormElement) {
		const result = validateForm(questionFormSchema, form, ["query", "topK"]);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSubmit(result.data);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && event.currentTarget.form) {
			event.preventDefault();
			if (!pending) submit(event.currentTarget.form);
		}
	}

	return (
		<form
			className="flex flex-col gap-4"
			noValidate
			onSubmit={(event: FormEvent<HTMLFormElement>) => {
				event.preventDefault();
				submit(event.currentTarget);
			}}
		>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="query">Question</Label>
				<Textarea
					id="query"
					name="query"
					rows={3}
					placeholder="How long do customers have to ask for a refund?"
					onKeyDown={handleKeyDown}
					aria-invalid={errors.query ? true : undefined}
					aria-describedby={errors.query ? "query-error" : undefined}
				/>
				{errors.query ? (
					<p id="query-error" className="text-xs text-destructive">
						{errors.query}
					</p>
				) : null}
			</div>
			<div className="flex items-end gap-3">
				<div className="w-32">
					<FormField
						name="topK"
						label="Passages"
						type="number"
						min={1}
						max={PLAYGROUND_LIMITS.TOP_K_MAX}
						defaultValue={PLAYGROUND_LIMITS.TOP_K_DEFAULT}
						error={errors.topK}
					/>
				</div>
				<Button type="submit" size="lg" disabled={pending}>
					{pending ? "Thinking…" : "Ask"}
				</Button>
			</div>
		</form>
	);
}
