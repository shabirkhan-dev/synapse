"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";

import { UnverifiedNotice } from "../components/unverified-notice";
import { AUTH_ROUTES } from "../constants/auth.constants";
import { useCurrentUserQuery } from "../hooks/queries/use-current-user-query";
import { useSessionStatus } from "../hooks/use-session";
import { useSignOutMutation } from "../hooks/mutations/use-sign-out-mutation";

export type SessionGateProps = {
	children: ReactNode;
	/** The organization picker for the header (owned by the organizations feature). */
	switcher?: ReactNode;
	/** The command palette trigger for the sidebar (owned by the command-palette feature). */
	search?: ReactNode;
	/** Recent conversations and documents for the sidebar (owned by the recent feature). */
	recent?: ReactNode;
	/** Counts next to sidebar links, by href (owned by the features that know them). */
	navBadges?: Partial<Record<string, ReactNode>>;
};

/** Workspace pages: signed-out visitors go to `/sign-in`; signed-in ones get the app shell. */
export function SessionGate({ children, switcher, search, recent, navBadges }: SessionGateProps) {
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
			search={search}
			recent={recent}
			navBadges={navBadges}
			notice={
				me.data && !me.data.emailVerifiedAt ? <UnverifiedNotice email={me.data.email} /> : null
			}
			signingOut={signOut.isPending}
			onSignOut={() => signOut.mutate()}
		>
			{children}
		</AppShell>
	);
}
