"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Badge } from "@synapse/ui/components/badge";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import QRCode from "qrcode";
import { type FormEvent, useEffect, useState } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";

import { mfaCodeFormSchema } from "../schemas/mfa.schema";
import type { MfaSetup, MfaStatus } from "../types/mfa.types";

export type TwoStepCardProps = {
	status: MfaStatus | undefined;
	/** A setup in progress (scan, then confirm a code). */
	setup: MfaSetup | null;
	/** Codes from turning it on: shown once. */
	recoveryCodes: string[] | null;
	pending: boolean;
	error: string | null;
	onStart: () => void;
	onConfirm: (code: string) => Promise<unknown>;
	onCancel: () => void;
	onDisable: (code: string) => Promise<unknown>;
	onDoneWithCodes: () => void;
};

/** A code field with Zod validation; clears itself after a successful submit. */
function CodeForm({
	label,
	submit,
	pending,
	onSubmit,
}: {
	label: string;
	submit: string;
	pending: boolean;
	onSubmit: (code: string) => Promise<unknown>;
}) {
	const [error, setError] = useState<string | undefined>();
	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const parsed = mfaCodeFormSchema.safeParse({ code: new FormData(form).get("mfa-code") });
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message);
			return;
		}
		setError(undefined);
		try {
			await onSubmit(parsed.data.code);
			form.reset();
		} catch {
			// The container shows the API's message.
		}
	}
	return (
		<form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit} noValidate>
			<div className="w-48">
				<FormField
					name="mfa-code"
					label={label}
					autoComplete="one-time-code"
					inputMode="numeric"
					error={error}
				/>
			</div>
			<SubmitButton disabled={pending}>{submit}</SubmitButton>
		</form>
	);
}

/** The QR code of the `otpauth://` link, drawn in the browser (the secret never leaves the page). */
function SetupCode({ uri }: { uri: string }) {
	const [image, setImage] = useState<string | null>(null);
	useEffect(() => {
		let live = true;
		QRCode.toDataURL(uri, { margin: 1, width: 176, errorCorrectionLevel: "M" }).then(
			(url) => live && setImage(url),
			() => live && setImage(null),
		);
		return () => {
			live = false;
		};
	}, [uri]);
	return image ? (
		// oxlint-disable-next-line nextjs/no-img-element -- a data URL drawn here, not a remote image
		<img
			src={image}
			alt="QR code for your authenticator app"
			width={176}
			height={176}
			className="rounded-lg border bg-white p-1"
		/>
	) : (
		<div className="size-44 rounded-lg border bg-muted" aria-hidden="true" />
	);
}

/** Two-step sign-in: off → scan and confirm → recovery codes (once) → on, with a way to turn it off. */
export function TwoStepCard({
	status,
	setup,
	recoveryCodes,
	pending,
	error,
	onStart,
	onConfirm,
	onCancel,
	onDisable,
	onDoneWithCodes,
}: TwoStepCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					Two-step sign-in
					{status?.enabled ? <Badge variant="secondary">On</Badge> : null}
				</CardTitle>
				<CardDescription>
					After your password, sign-in asks for a code from an authenticator app (1Password, Google
					Authenticator, Authy…), so a stolen password is not enough.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{error ? (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}

				{recoveryCodes ? (
					<Alert>
						<AlertTitle>Save these recovery codes now: they are not shown again</AlertTitle>
						<AlertDescription className="flex flex-col gap-3">
							<span>Each one signs you in once if you lose your phone.</span>
							<ul
								aria-label="Recovery codes"
								className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-foreground sm:w-fit"
							>
								{recoveryCodes.map((code) => (
									<li key={code}>{code}</li>
								))}
							</ul>
							<span className="flex flex-wrap items-center gap-2">
								<CopyButton text={recoveryCodes.join("\n")} label="Copy codes" />
								<Button variant="ghost" size="sm" onClick={onDoneWithCodes}>
									I saved them
								</Button>
							</span>
						</AlertDescription>
					</Alert>
				) : null}

				{status === undefined ? (
					<p role="status" className="text-xs text-muted-foreground">
						Loading…
					</p>
				) : setup ? (
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
						<SetupCode uri={setup.uri} />
						<div className="flex min-w-0 flex-col gap-3">
							<p className="text-sm">
								Scan the code with your authenticator app, or type this key into it:
							</p>
							<span className="flex flex-wrap items-center gap-2">
								<code className="rounded-md bg-muted px-2 py-1 font-mono text-xs break-all">
									{setup.secret.replace(/(.{4})/g, "$1 ").trim()}
								</code>
								<CopyButton text={setup.secret} label="Copy key" />
							</span>
							<CodeForm
								label="Code from the app"
								submit={pending ? "Checking…" : "Turn on"}
								pending={pending}
								onSubmit={onConfirm}
							/>
							<Button variant="ghost" size="sm" className="-ms-3 self-start" onClick={onCancel}>
								Cancel
							</Button>
						</div>
					</div>
				) : status.enabled ? (
					<>
						<p className="text-sm text-muted-foreground">
							{status.recoveryCodesLeft === 1
								? "1 recovery code left."
								: `${status.recoveryCodesLeft} recovery codes left.`}{" "}
							To turn it off, enter a current code or a recovery code.
						</p>
						<CodeForm
							label="Code"
							submit={pending ? "Turning off…" : "Turn off"}
							pending={pending}
							onSubmit={onDisable}
						/>
					</>
				) : (
					<Button className="self-start" disabled={pending} onClick={onStart}>
						{pending ? "Starting…" : "Set up two-step sign-in"}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
