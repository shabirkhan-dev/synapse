"use client";

import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "../../button/button";
import type { ButtonState } from "../../button/button.styles";
import { StatefulButton } from "../../button/stateful-button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../dialog/dialog";
import { Field } from "../../field/field";
import { Input } from "../../input/input";
import { cn } from "../../lib/utils";
import { MailIcon, TrashIcon } from "./icons";
import { settingsParts } from "./settings.styles";
import { validityMessage } from "./validity";

/** Stands in for your API when a callback is left out, so the dialogs can be tried as is. */
export const SIMULATED_MS = 900;
/** How long a dialog shows its success label before it closes. */
const DONE_HOLD_MS = 650;
/** A dialog's close transition, plus a frame. */
const CLOSE_MS = 200;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function messageOf(error: unknown): string {
	return error instanceof Error && error.message
		? error.message
		: "Something went wrong. Try again.";
}

/** A callback's answer: a message rejects, nothing accepts. Without a callback, wait a moment. */
async function run<A extends unknown[]>(
	callback: ((...args: A) => Promise<string | void> | string | void) | undefined,
	...args: A
): Promise<string | undefined> {
	if (!callback) {
		await pause(SIMULATED_MS);
		return undefined;
	}
	const result = await callback(...args);
	return typeof result === "string" && result ? result : undefined;
}

/**
 * A dialog that holds one small form: while it works, Escape and the backdrop cannot close it, and
 * it starts clean each time it opens (clearing on open, so nothing empties while it fades out).
 */
function useActionDialog(reset: () => void) {
	const [open, setOpen] = useState(false);
	const [state, setState] = useState<ButtonState>("idle");
	const busy = state === "loading" || state === "success";
	const onOpenChange = (next: boolean) => {
		if (busy && !next) return;
		if (next) {
			setState("idle");
			reset();
		}
		setOpen(next);
	};
	return { open, setOpen, onOpenChange, state, setState, busy };
}

export type ChangeEmailDialogProps = {
	/** The current email. */
	email: string;
	/** Start the change. Return a message to reject the address, or throw. */
	onChangeEmail?: (email: string) => Promise<string | void> | string | void;
	/** After `onChangeEmail` accepted the address, with the new email. */
	onChanged: (email: string) => void;
};

const EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";
const EMAIL_MESSAGES = {
	valueMissing: "Enter the new email address.",
	typeMismatch: "Enter an email address like name@example.com.",
	patternMismatch: "Enter an email address like name@example.com.",
	customError: "That is already your email.",
};

/** "Change email": a dialog with one email field, checked by its native constraints. */
export function ChangeEmailDialog({ email, onChangeEmail, onChanged }: ChangeEmailDialogProps) {
	const [value, setValue] = useState("");
	const [error, setError] = useState<string>();
	const dialog = useActionDialog(() => {
		setValue("");
		setError(undefined);
	});
	const inputRef = useRef<HTMLInputElement>(null);

	function check(input: HTMLInputElement) {
		const same = input.value.trim().toLowerCase() === email.toLowerCase();
		input.setCustomValidity(same ? EMAIL_MESSAGES.customError : "");
		return validityMessage(input, EMAIL_MESSAGES);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const input = inputRef.current;
		if (!input || dialog.busy) return;
		const message = check(input);
		if (message) {
			setError(message);
			input.focus();
			return;
		}
		const next = input.value.trim();
		dialog.setState("loading");
		try {
			const rejected = await run(onChangeEmail, next);
			if (rejected) {
				setError(rejected);
				dialog.setState("error");
				input.focus();
				return;
			}
			dialog.setState("success");
			await pause(DONE_HOLD_MS);
			onChanged(next);
			dialog.setOpen(false);
		} catch (caught) {
			setError(messageOf(caught));
			dialog.setState("error");
			input.focus();
		}
	}

	return (
		<Dialog open={dialog.open} onOpenChange={dialog.onOpenChange}>
			<DialogTrigger asChild>
				<Button variant="secondary" size="sm">
					<MailIcon />
					Change email
				</Button>
			</DialogTrigger>
			<DialogContent size="sm" dismissible={!dialog.busy}>
				<DialogHeader>
					<DialogTitle>Change email</DialogTitle>
					<DialogDescription>
						We will send a confirmation link to the new address. Until then you sign in with{" "}
						<span className="font-[510] text-foreground">{email}</span>.
					</DialogDescription>
				</DialogHeader>
				<form
					noValidate
					onSubmit={submit}
					className="grid gap-4"
					aria-busy={dialog.busy || undefined}
				>
					<Field label="New email" error={error}>
						<Input
							ref={inputRef}
							name="email"
							type="email"
							inputMode="email"
							autoComplete="email"
							placeholder="you@example.com"
							required
							pattern={EMAIL_PATTERN}
							leadingIcon={<MailIcon />}
							value={value}
							readOnly={dialog.busy}
							onChange={(event) => {
								setValue(event.target.value);
								if (dialog.state === "error") dialog.setState("idle");
								if (error) setError(check(event.target));
							}}
						/>
					</Field>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="secondary" disabled={dialog.busy}>
								Cancel
							</Button>
						</DialogClose>
						<StatefulButton
							type="submit"
							state={dialog.state}
							loadingText="Sending link"
							successText="Link sent"
							errorText="Try again"
						>
							Send link
						</StatefulButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export type DeleteAccountDialogProps = {
	/** What to type to confirm. */
	phrase: string;
	/** Delete the account. Return a message to refuse, or throw. */
	onDeleteAccount?: () => Promise<string | void> | string | void;
	/** After `onDeleteAccount` succeeded. */
	onDeleted: () => void;
	/** The trigger's label. */
	children?: ReactNode;
};

/**
 * "Delete account": type the phrase to confirm. The phrase is the field's `pattern`, so the browser
 * decides when it matches, and the delete button reads that with `:has(input:invalid)`.
 */
export function DeleteAccountDialog({
	phrase,
	onDeleteAccount,
	onDeleted,
	children = "Delete account",
}: DeleteAccountDialogProps) {
	const id = useId();
	const [value, setValue] = useState("");
	const [error, setError] = useState<string>();
	const [formError, setFormError] = useState<string>();
	const dialog = useActionDialog(() => {
		setValue("");
		setError(undefined);
		setFormError(undefined);
	});
	const inputRef = useRef<HTMLInputElement>(null);
	const mismatch = `Type “${phrase}” exactly to confirm.`;

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const input = inputRef.current;
		if (!input || dialog.busy) return;
		const message = validityMessage(input, { valueMissing: mismatch, patternMismatch: mismatch });
		if (message) {
			setError(message);
			input.focus();
			return;
		}
		setFormError(undefined);
		dialog.setState("loading");
		try {
			const refused = await run(onDeleteAccount);
			if (refused) {
				setFormError(refused);
				dialog.setState("error");
				return;
			}
			dialog.setState("success");
			await pause(DONE_HOLD_MS);
			dialog.setOpen(false);
			// After the panel has faded, so the dialog closes before its trigger is replaced.
			await pause(CLOSE_MS);
			onDeleted();
		} catch (caught) {
			setFormError(messageOf(caught));
			dialog.setState("error");
		}
	}

	return (
		<Dialog open={dialog.open} onOpenChange={dialog.onOpenChange}>
			<DialogTrigger asChild>
				<Button className={settingsParts.destructive} data-tone="soft">
					<TrashIcon />
					{children}
				</Button>
			</DialogTrigger>
			<DialogContent size="sm" dismissible={!dialog.busy}>
				<DialogHeader>
					<DialogTitle>Delete your account?</DialogTitle>
					<DialogDescription>
						This removes your profile, settings and everything you made, for good. It cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<form
					noValidate
					onSubmit={submit}
					className="rx-settings-confirm grid gap-4"
					aria-busy={dialog.busy || undefined}
				>
					<Field
						label={
							<>
								Type <span className="font-mono font-[590] select-all">{phrase}</span> to confirm
							</>
						}
						error={error}
					>
						<Input
							ref={inputRef}
							name="confirm"
							autoComplete="off"
							autoCapitalize="off"
							autoCorrect="off"
							spellCheck={false}
							required
							pattern={escapePattern(phrase)}
							value={value}
							readOnly={dialog.busy}
							onChange={(event) => {
								setValue(event.target.value);
								setFormError(undefined);
								if (dialog.state === "error") dialog.setState("idle");
								if (error)
									setError(
										validityMessage(event.target, {
											valueMissing: mismatch,
											patternMismatch: mismatch,
										}),
									);
							}}
						/>
					</Field>
					{formError ? (
						<p
							id={`${id}-error`}
							role="alert"
							className="m-0 rounded-(--radius-control) bg-destructive/10 px-3 py-2 text-[13px]/5 text-destructive"
						>
							{formError}
						</p>
					) : null}
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="secondary" disabled={dialog.busy}>
								Cancel
							</Button>
						</DialogClose>
						<StatefulButton
							type="submit"
							state={dialog.state}
							loadingText="Deleting"
							successText="Deleted"
							errorText="Try again"
							className={cn(settingsParts.destructive)}
						>
							Delete account
						</StatefulButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/** A `pattern` that matches the phrase and nothing else (`pattern` is anchored by the browser). */
export function escapePattern(phrase: string): string {
	return phrase.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
}
