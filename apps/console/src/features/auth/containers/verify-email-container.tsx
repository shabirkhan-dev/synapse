"use client";

import { useEffect, useRef } from "react";

import { type VerifyEmailState, VerifyEmailStatus } from "../components/verify-email-status";
import { useVerifyEmailMutation } from "../hooks/mutations/use-verify-email-mutation";
import { useLinkToken } from "../hooks/use-link-token";

/** `/verify-email?token=…` from the emailed link: verifies once on arrival. */
export function VerifyEmailContainer({ token }: { token: string | null }) {
	const verify = useVerifyEmailMutation();
	// The token is single-use: React's development double effect must not spend it twice.
	const started = useRef(false);
	useLinkToken(token);

	useEffect(() => {
		if (!token || started.current) return;
		started.current = true;
		verify.mutate(token);
	}, [token, verify]);

	const state: VerifyEmailState = !token
		? { kind: "missing-token" }
		: verify.isSuccess
			? { kind: "verified", email: verify.data.email }
			: verify.isError
				? { kind: "failed", message: verify.error.message }
				: { kind: "verifying" };
	return <VerifyEmailStatus state={state} />;
}
