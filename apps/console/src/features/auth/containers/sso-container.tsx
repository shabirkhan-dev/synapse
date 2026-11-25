"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SsoForm } from "../components/sso-form";
import { AUTH_ROUTES } from "../constants/auth.constants";
import { useStartSsoMutation } from "../hooks/mutations/use-start-sso-mutation";
import { useSessionStatus } from "../hooks/use-session";

/** `/sso`: the email picks the identity provider; the browser then leaves for it. */
export function SsoContainer() {
	const router = useRouter();
	const status = useSessionStatus();
	const start = useStartSsoMutation();

	useEffect(() => {
		if (status === "signed-in") router.replace(AUTH_ROUTES.HOME);
	}, [status, router]);

	return (
		<SsoForm
			// Stays pending after success: the page is navigating away.
			pending={start.isPending || start.isSuccess}
			error={start.error ? start.error.message : null}
			onSubmit={(email) =>
				start.mutate(email, {
					onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
				})
			}
		/>
	);
}
