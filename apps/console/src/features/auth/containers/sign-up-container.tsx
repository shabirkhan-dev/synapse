"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SignUpForm } from "../components/sign-up-form";
import { AUTH_ROUTES } from "../constants/auth.constants";
import { useSignUpMutation } from "../hooks/mutations/use-sign-up-mutation";
import { useSessionStatus } from "../hooks/use-session";

/** Creates the account; the new session goes straight to the workspace. */
export function SignUpContainer({ invite = null }: { invite?: string | null } = {}) {
	const router = useRouter();
	const status = useSessionStatus();
	const signUp = useSignUpMutation();

	useEffect(() => {
		if (status !== "signed-in") return;
		// Arrived from an invitation: go back to accept it.
		router.replace(
			invite ? `${AUTH_ROUTES.INVITE}?token=${encodeURIComponent(invite)}` : AUTH_ROUTES.HOME,
		);
	}, [status, router, invite]);

	return (
		<SignUpForm
			pending={signUp.isPending}
			error={signUp.error ? signUp.error.message : null}
			onSubmit={(input) => signUp.mutate(input)}
		/>
	);
}
