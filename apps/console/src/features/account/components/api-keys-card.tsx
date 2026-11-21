"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import { type FormEvent, useState } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";

import { createApiKeyFormSchema } from "../schemas/api-key.schema";
import type { ApiKey } from "../types/api-key.types";
import { formatRelative } from "../utils/format-relative";

export type ApiKeysCardProps = {
	keys: ApiKey[] | undefined;
	/** Organization names by id, to say where each key acts. */
	organizationName: (organizationId: string) => string;
	/** The active organization, where a new key will act. */
	activeOrganization: string;
	/** The key just created (shown once). */
	created: { name: string; key: string } | null;
	creating: boolean;
	revokingId: string | null;
	error: string | null;
	onCreate: (name: string) => Promise<unknown>;
	onRevoke: (key: ApiKey) => void;
	onDismissCreated: () => void;
};

/** Personal API keys: create one for the active organization (shown once), see and revoke them. */
export function ApiKeysCard({
	keys,
	organizationName,
	activeOrganization,
	created,
	creating,
	revokingId,
	error,
	onCreate,
	onRevoke,
	onDismissCreated,
}: ApiKeysCardProps) {
	const [nameError, setNameError] = useState<string | undefined>();

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const parsed = createApiKeyFormSchema.safeParse({ name: new FormData(form).get("key-name") });
		if (!parsed.success) {
			setNameError(parsed.error.issues[0]?.message);
			return;
		}
		setNameError(undefined);
		try {
			await onCreate(parsed.data.name);
			form.reset();
		} catch {
			// The container shows the API's message through `error`.
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>API keys</CardTitle>
				<CardDescription>
					Call the Synapse API from scripts as yourself: send{" "}
					<code className="font-mono text-xs">Authorization: Bearer syn_…</code>. A key works in one
					organization with your role there, and stops when you revoke it or leave.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{created ? (
					<Alert>
						<AlertTitle>Copy “{created.name}” now: it is not shown again</AlertTitle>
						<AlertDescription className="flex flex-col gap-2">
							<code className="font-mono text-xs break-all text-foreground">{created.key}</code>
							<span className="flex flex-wrap items-center gap-2">
								<CopyButton text={created.key} label="Copy key" />
								<Button variant="ghost" size="sm" onClick={onDismissCreated}>
									Done
								</Button>
							</span>
						</AlertDescription>
					</Alert>
				) : null}
				{error ? (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}
				{keys === undefined ? (
					<p role="status" className="text-xs text-muted-foreground">
						Loading keys…
					</p>
				) : keys.length === 0 ? (
					<p className="text-sm text-muted-foreground">No keys yet.</p>
				) : (
					<ul aria-label="API keys" className="flex flex-col divide-y">
						{keys.map((key) => (
							<li key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
								<span className="flex min-w-0 flex-col gap-0.5">
									<span className="truncate text-sm font-medium">{key.name}</span>
									<span className="text-xs text-muted-foreground">
										<code className="font-mono">{key.prefix}…</code> ·{" "}
										{organizationName(key.organizationId)} ·{" "}
										{key.lastUsedAt ? `used ${formatRelative(key.lastUsedAt)}` : "never used"}
									</span>
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={revokingId === key.id}
									aria-label={`Revoke the key “${key.name}”`}
									onClick={() => onRevoke(key)}
								>
									Revoke
								</Button>
							</li>
						))}
					</ul>
				)}
				<form
					className="flex flex-wrap items-end gap-3 border-t pt-4"
					onSubmit={handleSubmit}
					noValidate
				>
					<div className="min-w-56 flex-1">
						<FormField
							name="key-name"
							label="New key's name"
							placeholder="Nightly import"
							autoComplete="off"
							error={nameError}
						/>
					</div>
					<SubmitButton disabled={creating}>
						{creating ? "Creating…" : `Create a key for ${activeOrganization}`}
					</SubmitButton>
				</form>
			</CardContent>
		</Card>
	);
}
