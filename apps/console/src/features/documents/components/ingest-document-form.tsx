"use client";

import { Alert, AlertDescription } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import { Input } from "@synapse/ui/components/input";
import { Label } from "@synapse/ui/components/label";
import { Textarea } from "@synapse/ui/components/textarea";
import { type FormEvent, useState } from "react";

import { ingestDocumentFormSchema } from "../schemas/document.schema";
import type { IngestDocumentInput } from "../types/document.types";

export type IngestDocumentFormProps = {
	/** Resolves when stored; the form clears itself then. */
	onSubmit: (input: IngestDocumentInput) => Promise<unknown>;
	pending: boolean;
	error: string | null;
};

type Field = keyof IngestDocumentInput;

/** Title, text and an optional source, validated with Zod before `onSubmit`. */
export function IngestDocumentForm({ onSubmit, pending, error }: IngestDocumentFormProps) {
	const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const parsed = ingestDocumentFormSchema.safeParse({
			title: form.get("title"),
			content: form.get("content"),
			source: form.get("source") ?? undefined,
		});
		if (!parsed.success) {
			const errors: Partial<Record<Field, string>> = {};
			for (const issue of parsed.error.issues) errors[issue.path[0] as Field] ??= issue.message;
			setFieldErrors(errors);
			return;
		}
		setFieldErrors({});
		try {
			await onSubmit(parsed.data);
			formElement.reset();
		} catch {
			// The container shows the API's message through `error`; keep the text so nothing is lost.
		}
	}

	const fieldError = (field: Field) =>
		fieldErrors[field] ? (
			<p id={`${field}-error`} className="text-xs text-destructive">
				{fieldErrors[field]}
			</p>
		) : null;
	const invalid = (field: Field) =>
		fieldErrors[field]
			? { "aria-invalid": true as const, "aria-describedby": `${field}-error` }
			: {};

	return (
		<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="title">Title</Label>
				<Input id="title" name="title" {...invalid("title")} />
				{fieldError("title")}
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="source">Source (optional)</Label>
				<Input id="source" name="source" placeholder="https://…" {...invalid("source")} />
				{fieldError("source")}
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="content">Text</Label>
				<Textarea id="content" name="content" rows={8} {...invalid("content")} />
				{fieldError("content")}
			</div>
			{error ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			<Button type="submit" disabled={pending} className="self-start">
				{pending ? "Adding…" : "Add document"}
			</Button>
		</form>
	);
}
