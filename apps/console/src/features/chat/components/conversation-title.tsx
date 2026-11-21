"use client";

import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@synapse/ui/components/button";
import { Input } from "@synapse/ui/components/input";
import { type FormEvent, useState } from "react";

import { renameFormSchema } from "../schemas/chat.schema";

export type ConversationTitleProps = {
	title: string;
	/** Stored conversations can be renamed; a new chat cannot yet. */
	onRename?: (title: string) => Promise<unknown>;
	pending: boolean;
};

/** The page heading; a stored conversation's name can be edited in place. */
export function ConversationTitle({ title, onRename, pending }: ConversationTitleProps) {
	const [editing, setEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsed = renameFormSchema.safeParse({
			title: new FormData(event.currentTarget).get("title"),
		});
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Give the conversation a name.");
			return;
		}
		try {
			await onRename?.(parsed.data.title);
			setError(null);
			setEditing(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "The conversation was not renamed.");
		}
	}

	if (editing && onRename) {
		return (
			<form className="flex flex-col gap-1.5" onSubmit={handleSubmit} noValidate>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						name="title"
						defaultValue={title}
						aria-label="Conversation name"
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? "conversation-title-error" : undefined}
						maxLength={80}
						autoFocus
						className="max-w-md flex-1"
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								setError(null);
								setEditing(false);
							}
						}}
					/>
					<Button type="submit" disabled={pending}>
						{pending ? "Saving…" : "Save"}
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setError(null);
							setEditing(false);
						}}
					>
						Cancel
					</Button>
				</div>
				{error ? (
					<p id="conversation-title-error" className="text-xs text-destructive">
						{error}
					</p>
				) : null}
			</form>
		);
	}

	return (
		<div className="flex min-w-0 items-center gap-1">
			<h1 id="chat-title" className="min-w-0 text-xl font-semibold tracking-tight text-balance">
				{title}
			</h1>
			{onRename ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="text-muted-foreground"
					aria-label="Rename conversation"
					onClick={() => setEditing(true)}
				>
					<HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={1.5} aria-hidden="true" />
				</Button>
			) : null}
		</div>
	);
}
