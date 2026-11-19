"use client";

import { FileUploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
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
	/** Stores one file; resolves when stored. Several files are sent one after another. */
	onSubmit: (input: UploadDocumentInput) => Promise<unknown>;
	pending: boolean;
	/** The last single-file upload's error (several files show a result per file instead). */
	error: string | null;
	/** A new file was chosen: the last upload's error no longer applies. */
	onFileChange: () => void;
};

type Field = keyof UploadDocumentInput;

/** What happened to each file of a multi-file upload. */
type FileResult = { name: string; ok: boolean; message: string };

const ACCEPT = [...UPLOAD_LIMITS.EXTENSIONS, "text/plain", "text/markdown", "application/pdf"].join(
	",",
);

const MAX_FILES = 20;

/** The chosen files, as the drop zone names them. */
function describe(files: File[]): string {
	if (files.length <= 3) return files.map((file) => file.name).join(", ");
	return `${files
		.slice(0, 3)
		.map((file) => file.name)
		.join(", ")} and ${files.length - 3} more`;
}

function formatSize(bytes: number): string {
	return bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A file picker that also takes dropped files. One file can be given a title; several are uploaded
 * one after another, each reported on its own line.
 */
export function UploadDocumentForm({
	onSubmit,
	pending,
	error,
	onFileChange,
}: UploadDocumentFormProps) {
	const input = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useState<File[]>([]);
	const [dragging, setDragging] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
	const [results, setResults] = useState<FileResult[]>([]);
	const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
	const file = files.length === 1 ? (files[0] ?? null) : null;
	const many = files.length > 1;

	function choose(list: FileList | null) {
		setFiles(list ? [...list] : []);
		setFieldErrors({});
		setResults([]);
		onFileChange();
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setDragging(false);
		if (input.current) input.current.files = event.dataTransfer.files;
		choose(event.dataTransfer.files);
	}

	/** Several files: check them all first, then send them in turn and report each. */
	async function submitMany(formElement: HTMLFormElement) {
		if (files.length > MAX_FILES) {
			setFieldErrors({ file: `Choose at most ${MAX_FILES} files at a time` });
			return;
		}
		for (const chosen of files) {
			const parsed = uploadDocumentFormSchema.safeParse({ file: chosen, title: "" });
			if (!parsed.success) {
				setFieldErrors({ file: `${chosen.name}: ${parsed.error.issues[0]?.message ?? "invalid"}` });
				return;
			}
		}
		setFieldErrors({});
		const done: FileResult[] = [];
		setProgress({ done: 0, total: files.length });
		for (const chosen of files) {
			try {
				// oxlint-disable-next-line no-await-in-loop -- one upload at a time (per-user budget, order)
				await onSubmit({ file: chosen, title: undefined });
				done.push({ name: chosen.name, ok: true, message: "Added" });
			} catch (failure) {
				done.push({
					name: chosen.name,
					ok: false,
					message: failure instanceof Error ? failure.message : "Could not be added",
				});
			}
			setProgress({ done: done.length, total: files.length });
		}
		setProgress(null);
		setResults(done);
		formElement.reset();
		setFiles([]);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		if (many) {
			await submitMany(formElement);
			return;
		}
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
			setFiles([]);
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
						"flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-input px-4 py-8 text-center text-sm transition-colors hover:bg-muted/50",
						"has-[:focus-visible]:border-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
						dragging && "border-ring bg-muted",
						fileError && "border-destructive",
					)}
				>
					<span className="mb-2 flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground">
						<HugeiconsIcon
							icon={FileUploadIcon}
							strokeWidth={1.5}
							className="size-5"
							aria-hidden="true"
						/>
					</span>
					<span className="font-medium break-all">
						{files.length > 0 ? describe(files) : "Choose a file or drop it here"}
					</span>
					<span id="upload-file-hint" className="text-xs text-muted-foreground">
						{many
							? `${files.length} files · ${formatSize(files.reduce((sum, item) => sum + item.size, 0))}`
							: file
								? formatSize(file.size)
								: `.txt, .md or .pdf, up to 2 MB each; up to ${MAX_FILES} at once`}
					</span>
					<input
						ref={input}
						id="upload-file"
						name="upload-file"
						type="file"
						multiple
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
			<div className={cn("flex flex-col gap-1.5", many && "hidden")}>
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
			{error && !many && results.length === 0 ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			{results.length > 0 ? (
				<ul aria-label="Upload results" className="flex flex-col gap-1.5 text-xs">
					{results.map((result) => (
						<li key={`${result.name}:${result.message}`} className="flex items-start gap-2">
							<HugeiconsIcon
								icon={result.ok ? CheckmarkCircle02Icon : Cancel01Icon}
								strokeWidth={1.75}
								className={cn(
									"mt-px size-4 shrink-0",
									result.ok ? "text-primary" : "text-destructive",
								)}
								aria-hidden="true"
							/>
							<span className="min-w-0 break-words">
								<span className="font-medium">{result.name}</span>
								<span className={result.ok ? "text-muted-foreground" : "text-destructive"}>
									{" "}
									— {result.message}
								</span>
							</span>
						</li>
					))}
				</ul>
			) : null}
			<SubmitButton disabled={pending || progress !== null} className="self-start">
				{progress
					? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
					: pending
						? "Uploading…"
						: many
							? `Upload ${files.length} files`
							: "Upload file"}
			</SubmitButton>
		</form>
	);
}
