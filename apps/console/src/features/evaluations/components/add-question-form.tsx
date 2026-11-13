"use client";

import { Alert, AlertDescription } from "@synapse/ui/components/alert";
import { Checkbox } from "@synapse/ui/components/checkbox";
import { Label } from "@synapse/ui/components/label";
import { Textarea } from "@synapse/ui/components/textarea";
import { type FormEvent, useState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";

import { addQuestionFormSchema } from "../schemas/evaluation.schema";
import type { AddQuestionInput } from "../types/evaluation.types";

export type AddQuestionFormProps = {
	documents: { id: string; title: string }[];
	/** Resolves when stored; the form clears itself then. */
	onSubmit: (input: AddQuestionInput) => Promise<unknown>;
	pending: boolean;
	error: string | null;
};

type Field = keyof AddQuestionInput;

/** A question and the documents that should answer it. */
export function AddQuestionForm({ documents, onSubmit, pending, error }: AddQuestionFormProps) {
	const [question, setQuestion] = useState("");
	const [selected, setSelected] = useState<string[]>([]);
	const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

	function toggle(id: string, checked: boolean) {
		setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsed = addQuestionFormSchema.safeParse({ question, expectedDocumentIds: selected });
		if (!parsed.success) {
			const errors: Partial<Record<Field, string>> = {};
			for (const issue of parsed.error.issues) errors[issue.path[0] as Field] ??= issue.message;
			setFieldErrors(errors);
			return;
		}
		setFieldErrors({});
		try {
			await onSubmit(parsed.data);
			setQuestion("");
			setSelected([]);
		} catch {
			// The container shows the API's message through `error`; keep what was entered.
		}
	}

	return (
		<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="eval-question">Question</Label>
				<Textarea
					id="eval-question"
					rows={2}
					value={question}
					onChange={(event) => setQuestion(event.target.value)}
					placeholder="How long do customers have to ask for a refund?"
					{...(fieldErrors.question
						? { "aria-invalid": true as const, "aria-describedby": "eval-question-error" }
						: {})}
				/>
				{fieldErrors.question ? (
					<p id="eval-question-error" className="text-xs text-destructive">
						{fieldErrors.question}
					</p>
				) : null}
			</div>
			<fieldset
				className="flex flex-col gap-2"
				{...(fieldErrors.expectedDocumentIds ? { "aria-describedby": "eval-documents-error" } : {})}
			>
				<legend className="mb-1.5 text-sm font-medium">Documents that answer it</legend>
				{documents.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						Add documents first; questions point at them.
					</p>
				) : (
					<ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
						{documents.map((document) => (
							<li key={document.id}>
								<Label className="flex items-center gap-2 font-normal">
									<Checkbox
										checked={selected.includes(document.id)}
										onCheckedChange={(checked) => toggle(document.id, checked)}
									/>
									<span className="min-w-0 break-words">{document.title}</span>
								</Label>
							</li>
						))}
					</ul>
				)}
				{fieldErrors.expectedDocumentIds ? (
					<p id="eval-documents-error" className="text-xs text-destructive">
						{fieldErrors.expectedDocumentIds}
					</p>
				) : null}
			</fieldset>
			{error ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			<SubmitButton disabled={pending} className="self-start">
				{pending ? "Adding…" : "Add question"}
			</SubmitButton>
		</form>
	);
}
