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

import { useCurrentUserQuery } from "@/features/auth";

import { EmailStatus } from "../components/email-status";
import { SessionsList } from "../components/sessions-list";
import { useResendVerificationMutation } from "../hooks/mutations/use-resend-verification-mutation";
import { useRevokeOtherSessionsMutation } from "../hooks/mutations/use-revoke-other-sessions-mutation";
import { useRevokeSessionMutation } from "../hooks/mutations/use-revoke-session-mutation";
import { useSessionsQuery } from "../hooks/queries/use-sessions-query";

const plural = new Intl.PluralRules("en");

/** The signed-in user's email (verification) and the devices signed in to the account. */
export function AccountContainer() {
	const me = useCurrentUserQuery();
	const sessions = useSessionsQuery();
	const resend = useResendVerificationMutation();
	const revoke = useRevokeSessionMutation();
	const revokeOthers = useRevokeOtherSessionsMutation();
	const failure = revoke.error ?? revokeOthers.error;
	const signedOut = revokeOthers.data?.revoked;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Account</h1>
				<p className="text-xs text-muted-foreground">Your email and where you are signed in.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Email</CardTitle>
				</CardHeader>
				<CardContent>
					{me.data ? (
						<EmailStatus
							email={me.data.email}
							verifiedAt={me.data.emailVerifiedAt}
							sending={resend.isPending}
							sent={resend.isSuccess}
							error={resend.error?.message ?? null}
							onResend={() => resend.mutate()}
						/>
					) : (
						<p role="status" className="text-xs text-muted-foreground">
							Loading…
						</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Signed-in devices</CardTitle>
					<CardDescription>
						Sign out a device you no longer use or do not recognize.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<p role="status" className="text-xs text-muted-foreground empty:sr-only">
						{signedOut === undefined
							? ""
							: signedOut === 0
								? "No other device was signed in."
								: `Signed out ${signedOut} other ${plural.select(signedOut) === "one" ? "device" : "devices"}.`}
					</p>
					{failure ? (
						<Alert variant="destructive">
							<AlertTitle>The device was not signed out</AlertTitle>
							<AlertDescription>{failure.message}</AlertDescription>
						</Alert>
					) : null}
					{sessions.isPending ? (
						<p role="status" className="text-xs text-muted-foreground">
							Loading devices…
						</p>
					) : sessions.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Devices could not be loaded</AlertTitle>
							<AlertDescription className="flex flex-wrap items-center gap-2">
								{sessions.error.message}
								<Button size="sm" variant="outline" onClick={() => sessions.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : (
						<SessionsList
							sessions={sessions.data}
							revokingId={revoke.isPending ? (revoke.variables ?? null) : null}
							revokingOthers={revokeOthers.isPending}
							onRevoke={(session) => {
								revokeOthers.reset();
								revoke.mutate(session.id);
							}}
							onRevokeOthers={() => {
								revoke.reset();
								revokeOthers.mutate();
							}}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
