"use client";

import { FileUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@synapse/ui/components/alert";
import { Input } from "@synapse/ui/components/input";
import { Label } from "@synapse/ui/components/label";
import { cn } from "@synapse/ui/lib/utils";
import { type DragEvent, type FormEvent, useRef, useState } from "react";

import { SubmitButton } from "@/components/shared/submit-button";

import { UPLOAD_LIMITS } from "../constants/documents.constants";
import { uploadDocumentFormSchema } from "../schemas/document.schema";
import type { UploadDocumentInput } from "../types/document.types";

export type UploadDocumentFormProps = {
	/** Resolves when stored; the form clears itself then. */
	onSubmit: (input: UploadDocumentInput) => Promise<unknown>;
	pending: boolean;
	error: string | null;
	/** A new file was chosen: the last upload's error no longer applies. */
	onFileChange: () => void;
};

type Field = keyof UploadDocumentInput;

const ACCEPT = [...UPLOAD_LIMITS.EXTENSIONS, "text/plain", "text/markdown", "application/pdf"].join(
	",",
);

function formatSize(bytes: number): string {
	return bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A file picker that also takes a dropped file, and an optional title. */
export function UploadDocumentForm({
	onSubmit,
	pending,
	error,
	onFileChange,
}: UploadDocumentFormProps) {
	const input = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [dragging, setDragging] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});

	function choose(files: FileList | null) {
		setFile(files?.[0] ?? null);
		setFieldErrors({});
		onFileChange();
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setDragging(false);
		if (input.current) input.current.files = event.dataTransfer.files;
		choose(event.dataTransfer.files);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const parsed = uploadDocumentFormSchema.safeParse({
			file,
			title: new FormData(formElement).get("upload-title") ?? "",
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
			setFile(null);
		} catch {
			// The container shows the API's message through `error`; keep the file chosen.
		}
	}

	const fileError = fieldErrors.file;
	return (
		<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
			<div className="flex flex-col gap-1.5">
				{/* Dropping is an extra for pointer users; keyboards and screen readers use the file input. */}
				{/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
				<label
					htmlFor="upload-file"
					onDragOver={(event) => {
						event.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={handleDrop}
					className={cn(
						"flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-input px-4 py-6 text-center text-xs transition-colors hover:bg-muted/50",
						"has-[:focus-visible]:border-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
						dragging && "border-ring bg-muted",
						fileError && "border-destructive",
					)}
				>
					<HugeiconsIcon
						icon={FileUploadIcon}
						strokeWidth={1.5}
						className="size-5 text-muted-foreground"
						aria-hidden="true"
					/>
					<span className="font-medium break-all">
						{file ? file.name : "Choose a file or drop it here"}
					</span>
					<span id="upload-file-hint" className="text-muted-foreground">
						{file ? formatSize(file.size) : ".txt, .md or .pdf, up to 2 MB"}
					</span>
					<input
						ref={input}
						id="upload-file"
						name="upload-file"
						type="file"
						accept={ACCEPT}
						className="sr-only"
						onChange={(event) => choose(event.currentTarget.files)}
						aria-describedby={fileError ? "upload-file-error" : "upload-file-hint"}
						{...(fileError ? { "aria-invalid": true as const } : {})}
					/>
				</label>
				{fileError ? (
					<p id="upload-file-error" className="text-xs text-destructive">
						{fileError}
					</p>
				) : null}
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="upload-title">Title (optional)</Label>
				<Input
					id="upload-title"
					name="upload-title"
					placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "The file name"}
					{...(fieldErrors.title
						? { "aria-invalid": true as const, "aria-describedby": "upload-title-error" }
						: {})}
				/>
				{fieldErrors.title ? (
					<p id="upload-title-error" className="text-xs text-destructive">
						{fieldErrors.title}
					</p>
				) : null}
			</div>
			{error ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			<SubmitButton disabled={pending} className="self-start">
				{pending ? "Uploading…" : "Upload file"}
			</SubmitButton>
		</form>
	);
}
