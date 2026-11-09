import { AuthCard } from "@/components/shared/auth-card";
import { LinkButton } from "@/components/shared/link-button";

import { AUTH_ROUTES } from "../constants/auth.constants";
import { FormMessage } from "./form-message";

export type VerifyEmailState =
	| { kind: "verifying" }
	| { kind: "verified"; email: string }
	| { kind: "failed"; message: string }
	| { kind: "missing-token" };

export function VerifyEmailStatus({ state }: { state: VerifyEmailState }) {
	if (state.kind === "verifying") {
		return (
			<AuthCard title="Verifying your email…" description="This takes a moment.">
				<p role="status" className="text-xs text-muted-foreground">
					Checking the link…
				</p>
			</AuthCard>
		);
	}
	if (state.kind === "verified") {
		return (
			<AuthCard title="Email verified" description={`${state.email} is confirmed. Thank you.`}>
				<LinkButton href={AUTH_ROUTES.HOME} className="w-full">
					Continue to Synapse
				</LinkButton>
			</AuthCard>
		);
	}
	return (
		<AuthCard
			title="This link did not work"
			description="Links work once and for 24 hours. Sign in to ask for a new one."
		>
			<div className="flex flex-col gap-4">
				<FormMessage
					error={state.kind === "failed" ? state.message : "The link has no token in it."}
				/>
				<LinkButton href={AUTH_ROUTES.SIGN_IN} variant="outline" className="w-full">
					Sign in
				</LinkButton>
			</div>
		</AuthCard>
	);
}
