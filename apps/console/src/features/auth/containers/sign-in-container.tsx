"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SignInForm } from "../components/sign-in-form";
import { AUTH_ROUTES } from "../constants/auth.constants";
import { useSessionStatus } from "../hooks/use-session";
import { useSignInMutation } from "../hooks/mutations/use-sign-in-mutation";

/** Sign-in page: on success (or when already signed in) go to the documents. */
export function SignInContainer() {
	const router = useRouter();
	const status = useSessionStatus();
	const signIn = useSignInMutation();

	useEffect(() => {
		if (status === "signed-in") router.replace(AUTH_ROUTES.HOME);
	}, [status, router]);

	return (
		<SignInForm
			pending={signIn.isPending}
			error={signIn.error ? signIn.error.message : null}
			onSubmit={(input) => signIn.mutate(input)}
		/>
	);
}
