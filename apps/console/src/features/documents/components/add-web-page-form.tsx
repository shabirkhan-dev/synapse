"use client";

import { Alert, AlertDescription } from "@synapse/ui/components/alert";
import { Input } from "@synapse/ui/components/input";
import { Label } from "@synapse/ui/components/label";
import { type FormEvent, useState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";

import { webPageFormSchema } from "../schemas/document.schema";
import type { DocumentSummary, WebPageInput } from "../types/document.types";

export type AddWebPageFormProps = {
	/** Resolves with the stored document; the form clears itself then. */
	onSubmit: (input: WebPageInput) => Promise<DocumentSummary>;
	pending: boolean;
	error: string | null;
};

/** One public web page by address; its text (with headings) is read and stored. */
export function AddWebPageForm({ onSubmit, pending, error }: AddWebPageFormProps) {
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [added, setAdded] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		setAdded(null);
		const parsed = webPageFormSchema.safeParse({
			url: new FormData(formElement).get("page-url") ?? "",
		});
		if (!parsed.success) {
			setFieldError(parsed.error.issues[0]?.message ?? "Check the address");
			return;
		}
		setFieldError(null);
		try {
			const document = await onSubmit(parsed.data);
			formElement.reset();
			setAdded(document.title);
		} catch {
			// The container shows the API's reason through `error`; keep the address to fix it.
		}
	}

	return (
		<form className="flex flex-col gap-1.5" onSubmit={handleSubmit} noValidate>
			<Label htmlFor="page-url">Page address</Label>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					id="page-url"
					name="page-url"
					type="url"
					inputMode="url"
					autoComplete="url"
					placeholder="https://example.com/help/refunds"
					className="sm:flex-1"
					aria-describedby={fieldError ? "page-url-error" : "page-url-hint"}
					{...(fieldError ? { "aria-invalid": true as const } : {})}
				/>
				<SubmitButton disabled={pending} className="sm:self-start">
					{pending ? "Reading page…" : "Add page"}
				</SubmitButton>
			</div>
			{fieldError ? (
				<p id="page-url-error" className="text-xs text-destructive">
					{fieldError}
				</p>
			) : (
				<p id="page-url-hint" className="text-xs text-muted-foreground">
					A public page; its text and headings are kept, not its images or scripts.
				</p>
			)}
			{error ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			{added ? (
				<p role="status" className="text-xs text-muted-foreground">
					Added “{added}”.
				</p>
			) : null}
		</form>
	);
}
