"use client";

import { ArrowUp02Icon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@synapse/ui/components/button";
import { Label } from "@synapse/ui/components/label";
import { Textarea } from "@synapse/ui/components/textarea";
import { type FormEvent, type KeyboardEvent, type ReactNode, useState } from "react";

import { validateForm } from "@/lib/forms/validate-form";

import { messageFormSchema } from "../schemas/chat.schema";

export type ChatComposerProps = {
	streaming: boolean;
	/** Text to put back after a failed send. */
	draft: string;
	onSend: (text: string) => void;
	onStop: () => void;
	/** Controls on the left of the send button (the documents to search). */
	toolbar?: ReactNode;
	/** First focus on the box (a new chat). */
	autoFocus?: boolean;
};

/** The message box: Enter sends, Shift+Enter starts a new line; Stop ends a streaming answer. */
export function ChatComposer({
	streaming,
	draft,
	onSend,
	onStop,
	toolbar,
	autoFocus = false,
}: ChatComposerProps) {
	const [error, setError] = useState<string | undefined>();

	function submit(form: HTMLFormElement) {
		const result = validateForm(messageFormSchema, form, ["text"]);
		setError(result.success ? undefined : result.errors.text);
		if (!result.success) return;
		onSend(result.data.text);
		form.reset();
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!streaming) submit(event.currentTarget);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// Not while an input method is composing (Enter confirms the composition there).
		if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
		event.preventDefault();
		if (!streaming && event.currentTarget.form) submit(event.currentTarget.form);
	}

	return (
		<form className="flex flex-col gap-1.5" onSubmit={handleSubmit} noValidate>
			<Label htmlFor="chat-message" className="sr-only">
				Message
			</Label>
			<div className="flex flex-col gap-1 rounded-2xl border bg-card p-2 shadow-pop transition-[border-color,box-shadow] duration-150 focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/10">
				<Textarea
					key={draft}
					id="chat-message"
					name="text"
					defaultValue={draft}
					rows={1}
					autoComplete="off"
					// oxlint-disable-next-line jsx-a11y/no-autofocus -- a new chat is for typing; the page has nothing else to do first
					autoFocus={autoFocus}
					placeholder="Ask anything about your documents…"
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? "chat-message-error chat-message-hint" : "chat-message-hint"}
					onKeyDown={handleKeyDown}
					className="max-h-56 min-h-12 resize-none border-0 bg-transparent px-2.5 py-2 text-base shadow-none focus-visible:ring-0 md:text-[0.9375rem]"
				/>
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-1">{toolbar}</div>
					{streaming ? (
						<Button
							key="stop"
							type="button"
							variant="secondary"
							size="icon"
							aria-label="Stop"
							title="Stop"
							className="size-9 shrink-0 rounded-full"
							onClick={onStop}
						>
							<HugeiconsIcon icon={StopIcon} size={16} strokeWidth={2} aria-hidden="true" />
						</Button>
					) : (
						<Button
							key="send"
							type="submit"
							size="icon"
							aria-label="Send"
							title="Send"
							className="size-9 shrink-0 rounded-full"
						>
							<HugeiconsIcon icon={ArrowUp02Icon} size={18} strokeWidth={2} aria-hidden="true" />
						</Button>
					)}
				</div>
			</div>
			<p
				id="chat-message-hint"
				className="px-2 text-center text-xs text-pretty text-muted-foreground"
			>
				<kbd className="font-mono">Enter</kbd> to send ·{" "}
				<kbd className="font-mono">Shift + Enter</kbd> for a new line · answers come from the
				documents of the workspace you are in
			</p>
			{error ? (
				<p id="chat-message-error" className="text-xs text-destructive">
					{error}
				</p>
			) : null}
		</form>
	);
}
