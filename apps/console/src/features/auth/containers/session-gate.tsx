"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";

import { AUTH_ROUTES } from "../constants/auth.constants";
import { useCurrentUserQuery } from "../hooks/queries/use-current-user-query";
import { useSessionStatus } from "../hooks/use-session";
import { useSignOutMutation } from "../hooks/mutations/use-sign-out-mutation";

export type SessionGateProps = {
	children: ReactNode;
	/** The organization picker for the header (owned by the organizations feature). */
	switcher?: ReactNode;
};

/** Workspace pages: signed-out visitors go to `/sign-in`; signed-in ones get the app shell. */
export function SessionGate({ children, switcher }: SessionGateProps) {
	const router = useRouter();
	const status = useSessionStatus();
	const signOut = useSignOutMutation();
	const me = useCurrentUserQuery({ enabled: status === "signed-in" });

	useEffect(() => {
		if (status === "signed-out") router.replace(AUTH_ROUTES.SIGN_IN);
	}, [status, router]);

	if (status !== "signed-in") return null;
	return (
		<AppShell
			email={me.data?.email ?? null}
			switcher={switcher}
			signingOut={signOut.isPending}
			onSignOut={() => signOut.mutate()}
		>
			{children}
		</AppShell>
	);
}
