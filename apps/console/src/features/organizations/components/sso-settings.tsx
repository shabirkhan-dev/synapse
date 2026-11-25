"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@synapse/ui/components/alert-dialog";
import { Button } from "@synapse/ui/components/button";
import { type FormEvent, useState } from "react";

import { FormField } from "@/components/shared/form-field";
import { StatusDot } from "@/components/shared/status-dot";
import { SubmitButton } from "@/components/shared/submit-button";
import { validateForm } from "@/lib/forms/validate-form";

import { ssoFormSchema } from "../schemas/organization.schema";
import type { SsoConnection, SsoSettingsInput } from "../types/organization.types";
import { RoleSelect } from "./role-select";

const FIELDS = ["issuer", "clientId", "clientSecret", "domains", "defaultRole"] as const;
const JOIN_ROLES = ["member", "admin"] as const;

export type SsoSettingsProps = {
	connection: SsoConnection | null;
	/** Owners change it; admins only read it. */
	canEdit: boolean;
	saving: boolean;
	checking: boolean;
	removing: boolean;
	onSave: (input: SsoSettingsInput) => void;
	onCheck: () => void;
	onRemove: () => void;
};

/**
 * The team's OpenID Connect provider: its issuer and client, the email domains it signs in, the
 * callback URL to register with it, and the DNS record that proves each domain is the team's.
 */
export function SsoSettings({
	connection,
	canEdit,
	saving,
	checking,
	removing,
	onSave,
	onCheck,
	onRemove,
}: SsoSettingsProps) {
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [confirming, setConfirming] = useState(false);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const result = validateForm(ssoFormSchema, event.currentTarget, FIELDS);
		setErrors(result.success ? {} : result.errors);
		if (result.success) onSave(result.data);
	}

	const waiting = connection?.domains.some((domain) => domain.verifiedAt === null) ?? false;

	return (
		<div className="flex flex-col gap-6">
			{connection ? (
				<section aria-labelledby="sso-domains" className="flex flex-col gap-3">
					<h3 id="sso-domains" className="text-sm font-medium">
						Domains
					</h3>
					<p className="max-w-prose text-sm text-pretty text-muted-foreground">
						People with these email addresses sign in through your provider once a domain is
						verified. For each one, add a DNS <span className="font-mono text-xs">TXT</span> record
						named <span className="font-mono text-xs">{connection.dnsRecord.name}</span>.
						<span className="italic">domain</span> with this value, then check:
					</p>
					<p className="rounded-lg border bg-muted px-3 py-2 font-mono text-xs break-all">
						{connection.dnsRecord.value}
					</p>
					<ul aria-label="Domains" className="flex flex-col divide-y">
						{connection.domains.map((item) => (
							<li
								key={item.domain}
								className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
							>
								<span className="min-w-0 font-mono text-[0.8125rem] break-all">{item.domain}</span>
								{item.verifiedAt ? (
									<StatusDot tone="ok">Verified</StatusDot>
								) : (
									<StatusDot tone="wait">Waiting for DNS</StatusDot>
								)}
							</li>
						))}
					</ul>
					{canEdit && waiting ? (
						<div>
							<Button variant="outline" disabled={checking} onClick={onCheck}>
								{checking ? "Checking…" : "Check DNS records"}
							</Button>
						</div>
					) : null}
					<p className="text-sm text-muted-foreground">
						Register this callback (redirect) URL with your provider:{" "}
						<span className="font-mono text-xs break-all text-foreground">
							{connection.redirectUri}
						</span>
					</p>
				</section>
			) : null}

			{canEdit ? (
				<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
					<FormField
						name="issuer"
						label="Issuer URL"
						type="url"
						placeholder="https://login.example.com"
						defaultValue={connection?.issuer ?? ""}
						error={errors.issuer}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField
							name="clientId"
							label="Client ID"
							autoComplete="off"
							defaultValue={connection?.clientId ?? ""}
							error={errors.clientId}
						/>
						<FormField
							name="clientSecret"
							label="Client secret"
							type="password"
							autoComplete="new-password"
							placeholder={connection?.hasClientSecret ? "Saved; leave empty to keep it" : ""}
							error={errors.clientSecret}
						/>
					</div>
					<FormField
						name="domains"
						label="Sign-in domains"
						placeholder="example.com, example.org"
						defaultValue={connection?.domains.map((item) => item.domain).join(", ") ?? ""}
						error={errors.domains}
					/>
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div className="flex flex-col gap-1.5">
							<span className="text-sm font-medium">Role for people who join this way</span>
							<RoleSelect
								label="Role for people who join this way"
								name="defaultRole"
								roles={JOIN_ROLES}
								defaultValue={connection?.defaultRole === "admin" ? "admin" : "member"}
							/>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{connection ? (
								<Button
									type="button"
									variant="destructive"
									disabled={removing}
									onClick={() => setConfirming(true)}
								>
									{removing ? "Turning off…" : "Turn off…"}
								</Button>
							) : null}
							<SubmitButton disabled={saving}>
								{saving ? "Checking the provider…" : connection ? "Save changes" : "Set up"}
							</SubmitButton>
						</div>
					</div>
				</form>
			) : (
				<p className="text-sm text-muted-foreground">
					{connection
						? `Provider: ${connection.issuer}. Only owners change these settings.`
						: "Not set up. Only owners can set it up."}
				</p>
			)}

			<AlertDialog open={confirming} onOpenChange={setConfirming}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Turn off single sign-on?</AlertDialogTitle>
						<AlertDialogDescription>
							People can no longer sign in through your provider. Their accounts and team membership
							stay; they can set a password with “Forgot your password?”. Setting it up again needs
							the DNS records checked again.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								setConfirming(false);
								onRemove();
							}}
						>
							Turn off single sign-on
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
