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

import { LinkButton } from "@/components/shared/link-button";
import { AUTH_ROUTES, useLinkToken, useSessionStatus } from "@/features/auth";

import { useAcceptInvitationMutation } from "../hooks/mutations/use-accept-invitation-mutation";

/**
 * `/invite?token=…` from an invitation email. Signed out: create an account or sign in with the
 * invited address, then come back here. Signed in: join the team with one click.
 */
export function AcceptInvitationContainer({ token }: { token: string | null }) {
	const status = useSessionStatus();
	const accept = useAcceptInvitationMutation();
	useLinkToken(token);

	if (!token) {
		return (
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle render={<h1 />}>This link is incomplete</CardTitle>
					<CardDescription>Open the link from the invitation email again.</CardDescription>
				</CardHeader>
			</Card>
		);
	}
	const back = `?invite=${encodeURIComponent(token)}`;

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle render={<h1 />}>
					{accept.isSuccess ? `You joined ${accept.data.name}` : "Join a team on Synapse"}
				</CardTitle>
				<CardDescription>
					{accept.isSuccess
						? "You now work in this team. Its documents, chat and approvals are shared with its members."
						: status === "signed-in"
							? "You were invited to a team. Joining shares its documents, chat and approvals with you."
							: "You were invited to a team. Create an account or sign in with the email address the invitation was sent to."}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{accept.isError ? (
					<Alert variant="destructive">
						<AlertTitle>You did not join</AlertTitle>
						<AlertDescription>{accept.error.message}</AlertDescription>
					</Alert>
				) : null}
				{accept.isSuccess ? (
					<LinkButton href={AUTH_ROUTES.HOME}>Open the team</LinkButton>
				) : status === "signed-in" ? (
					<Button disabled={accept.isPending} onClick={() => accept.mutate(token)}>
						{accept.isPending ? "Joining…" : "Join the team"}
					</Button>
				) : status === "signed-out" ? (
					<div className="flex flex-col gap-2">
						<LinkButton href={`${AUTH_ROUTES.SIGN_UP}${back}`}>Create an account</LinkButton>
						<LinkButton variant="outline" href={`${AUTH_ROUTES.SIGN_IN}${back}`}>
							Sign in
						</LinkButton>
					</div>
				) : (
					<p role="status" className="text-xs text-muted-foreground">
						Checking whether you are signed in…
					</p>
				)}
			</CardContent>
		</Card>
	);
}
