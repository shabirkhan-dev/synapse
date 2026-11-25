import { AuthCard } from "@/components/shared/auth-card";
import { LinkButton } from "@/components/shared/link-button";

import { AUTH_ROUTES } from "../constants/auth.constants";
import { FormMessage } from "./form-message";

export type SsoCallbackState = { kind: "signing-in" } | { kind: "failed"; message: string };

/** Back from the identity provider: a moment of "signing in", or what went wrong and a way back. */
export function SsoCallbackStatus({ state }: { state: SsoCallbackState }) {
	if (state.kind === "signing-in") {
		return (
			<AuthCard title="Signing you in…" description="Your company's sign-in went through.">
				<p role="status" className="text-xs text-muted-foreground">
					Finishing sign-in…
				</p>
			</AuthCard>
		);
	}
	return (
		<AuthCard
			title="Single sign-on did not finish"
			description="Start again; if it keeps failing, ask whoever runs your team's sign-in."
		>
			<div className="flex flex-col gap-4">
				<FormMessage error={state.message} />
				<LinkButton href={AUTH_ROUTES.SSO} className="w-full">
					Try single sign-on again
				</LinkButton>
				<LinkButton href={AUTH_ROUTES.SIGN_IN} variant="outline" className="w-full">
					Sign in with a password
				</LinkButton>
			</div>
		</AuthCard>
	);
}
