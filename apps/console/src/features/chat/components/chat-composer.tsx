"use client";

import { Button } from "@synapse/ui/components/button";
import { Label } from "@synapse/ui/components/label";
import { Textarea } from "@synapse/ui/components/textarea";
import { type FormEvent, type KeyboardEvent, useState } from "react";

import { validateForm } from "@/lib/forms/validate-form";

import { messageFormSchema } from "../schemas/chat.schema";

export type ChatComposerProps = {
	streaming: boolean;
	/** Text to put back after a failed send. */
	draft: string;
	onSend: (text: string) => void;
	onStop: () => void;
};

/** The message box: Enter sends, Shift+Enter starts a new line; Stop ends a streaming answer. */
export function ChatComposer({ streaming, draft, onSend, onStop }: ChatComposerProps) {
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
			<div className="flex items-end gap-2">
				<Textarea
					key={draft}
					id="chat-message"
					name="text"
					defaultValue={draft}
					rows={1}
					autoComplete="off"
					placeholder="How long do customers have to ask for a refund?"
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? "chat-message-error chat-message-hint" : "chat-message-hint"}
					onKeyDown={handleKeyDown}
					className="max-h-48 min-h-10 text-base md:text-sm"
				/>
				{streaming ? (
					<Button key="stop" type="button" variant="outline" size="lg" onClick={onStop}>
						Stop
					</Button>
				) : (
					<Button key="send" type="submit" size="lg">
						Send
					</Button>
				)}
			</div>
			{error ? (
				<p id="chat-message-error" className="text-xs text-destructive">
					{error}
				</p>
			) : null}
			<p id="chat-message-hint" className="text-xs text-muted-foreground">
				Enter to send, Shift+Enter for a new line. Answers search the documents of the organization
				you are in.
			</p>
		</form>
	);
}
