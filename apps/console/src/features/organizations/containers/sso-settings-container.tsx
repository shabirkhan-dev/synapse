"use client";

import { SecurityLockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";

import { can, type OrganizationRole } from "@/lib/permissions";

import { SsoSettings } from "../components/sso-settings";
import { useDeleteSsoConnectionMutation } from "../hooks/mutations/use-delete-sso-connection-mutation";
import { useSaveSsoConnectionMutation } from "../hooks/mutations/use-save-sso-connection-mutation";
import { useVerifySsoDomainsMutation } from "../hooks/mutations/use-verify-sso-domains-mutation";
import { useSsoConnectionQuery } from "../hooks/queries/use-sso-connection-query";

/** The team's single sign-on card (admins and owners see it; owners change it). */
export function SsoSettingsContainer({
	organizationId,
	role,
}: {
	organizationId: string;
	role: OrganizationRole;
}) {
	const connection = useSsoConnectionQuery(organizationId);
	const save = useSaveSsoConnectionMutation(organizationId);
	const check = useVerifySsoDomainsMutation(organizationId);
	const remove = useDeleteSsoConnectionMutation(organizationId);
	const failure = save.error ?? check.error ?? remove.error;
	const reset = () => [save, check, remove].forEach((mutation) => mutation.reset());

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<HugeiconsIcon icon={SecurityLockIcon} strokeWidth={1.75} aria-hidden="true" />
					Single sign-on
				</CardTitle>
				<CardDescription>
					Let people sign in with your company&rsquo;s identity provider (OpenID Connect). They join
					this team the first time.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{failure ? (
					<Alert variant="destructive">
						<AlertTitle>That did not go through</AlertTitle>
						<AlertDescription>{failure.message}</AlertDescription>
					</Alert>
				) : null}
				{connection.isPending ? (
					<p role="status" className="text-xs text-muted-foreground">
						Loading single sign-on…
					</p>
				) : connection.isError ? (
					<Alert variant="destructive">
						<AlertTitle>Single sign-on could not be loaded</AlertTitle>
						<AlertDescription>{connection.error.message}</AlertDescription>
					</Alert>
				) : (
					<SsoSettings
						// Remount with the saved values after each change.
						key={connection.data?.updatedAt ?? "none"}
						connection={connection.data}
						canEdit={can(role, "sso.manage")}
						saving={save.isPending}
						checking={check.isPending}
						removing={remove.isPending}
						onSave={(input) => {
							reset();
							save.mutate(input);
						}}
						onCheck={() => {
							reset();
							check.mutate();
						}}
						onRemove={() => {
							reset();
							remove.mutate();
						}}
					/>
				)}
			</CardContent>
		</Card>
	);
}
