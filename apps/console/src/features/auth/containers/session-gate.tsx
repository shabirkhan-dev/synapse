"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";

import { AUTH_ROUTES } from "../constants/auth.constants";
import { useSessionStatus } from "../hooks/use-session";
import { useSignOutMutation } from "../hooks/mutations/use-sign-out-mutation";

/** Workspace pages: signed-out visitors go to `/sign-in`; signed-in ones get the app shell. */
export function SessionGate({ children }: { children: ReactNode }) {
	const router = useRouter();
	const status = useSessionStatus();
	const signOut = useSignOutMutation();

	useEffect(() => {
		if (status === "signed-out") router.replace(AUTH_ROUTES.SIGN_IN);
	}, [status, router]);

	if (status !== "signed-in") return null;
	return (
		<AppShell signingOut={signOut.isPending} onSignOut={() => signOut.mutate()}>
			{children}
		</AppShell>
	);
}
