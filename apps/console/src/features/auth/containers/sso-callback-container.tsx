"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { type SsoCallbackState, SsoCallbackStatus } from "../components/sso-callback-status";
import { AUTH_ROUTES } from "../constants/auth.constants";
import { useCompleteSsoMutation } from "../hooks/mutations/use-complete-sso-mutation";

export type SsoCallbackContainerProps = {
	code: string | null;
	state: string | null;
	/** `error_description` (or `error`) when the provider sent the person back without a code. */
	providerError: string | null;
};

/** `/sso/callback?code&state`: finishes the sign-in once, then opens the workspace. */
export function SsoCallbackContainer({ code, state, providerError }: SsoCallbackContainerProps) {
	const router = useRouter();
	const complete = useCompleteSsoMutation();
	// The code is single-use: React's development double effect must not spend it twice.
	const started = useRef(false);

	useEffect(() => {
		// The code and state are spent either way; keep them out of history.
		window.history.replaceState(window.history.state, "", AUTH_ROUTES.SSO_CALLBACK);
	}, []);

	useEffect(() => {
		if (!code || !state || started.current) return;
		started.current = true;
		complete.mutate({ code, state }, { onSuccess: () => router.replace(AUTH_ROUTES.HOME) });
	}, [code, state, complete, router]);

	const view: SsoCallbackState = providerError
		? { kind: "failed", message: `Your company's sign-in said: ${providerError}` }
		: !code || !state
			? { kind: "failed", message: "The sign-in page sent you back without a sign-in code." }
			: complete.isError
				? { kind: "failed", message: complete.error.message }
				: { kind: "signing-in" };
	return <SsoCallbackStatus state={view} />;
}
