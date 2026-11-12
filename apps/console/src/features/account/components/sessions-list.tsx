"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@synapse/ui/components/alert-dialog";
import { Badge } from "@synapse/ui/components/badge";
import { Button } from "@synapse/ui/components/button";
import { useState } from "react";

import type { Session } from "../types/session.types";
import { describeUserAgent } from "../utils/describe-user-agent";
import { formatRelative } from "../utils/format-relative";

export type SessionsListProps = {
	sessions: Session[];
	/** The session being signed out right now. */
	revokingId: string | null;
	revokingOthers: boolean;
	onRevoke: (session: Session) => void;
	onRevokeOthers: () => void;
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const plural = new Intl.PluralRules("en");
const devices = (count: number) =>
	plural.select(count) === "one" ? "1 other device" : `${count} other devices`;

/** Where the account is signed in; this device first, each other one can be signed out. */
export function SessionsList({
	sessions,
	revokingId,
	revokingOthers,
	onRevoke,
	onRevokeOthers,
}: SessionsListProps) {
	const [confirming, setConfirming] = useState(false);
	const ordered = sessions.toSorted((a, b) => Number(b.current) - Number(a.current));
	const others = sessions.filter((session) => !session.current).length;

	return (
		<div className="flex flex-col gap-4">
			<ul className="flex flex-col divide-y">
				{ordered.map((session) => {
					const device = describeUserAgent(session.userAgent);
					const signedIn = dateFormat.format(new Date(session.createdAt));
					return (
						<li key={session.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<p className="flex flex-wrap items-center gap-2 text-sm font-medium">
									{device}
									{session.current ? <Badge variant="outline">This device</Badge> : null}
								</p>
								<p className="text-xs text-muted-foreground">
									Signed in <time dateTime={session.createdAt}>{signedIn}</time> · active{" "}
									<time dateTime={session.lastActiveAt}>
										{formatRelative(session.lastActiveAt)}
									</time>
								</p>
							</div>
							{session.current ? null : (
								<Button
									variant="outline"
									disabled={revokingId === session.id || revokingOthers}
									aria-label={`Sign out ${device}, signed in ${signedIn}`}
									onClick={() => onRevoke(session)}
								>
									{revokingId === session.id ? "Signing out…" : "Sign out"}
								</Button>
							)}
						</li>
					);
				})}
			</ul>
			{others > 0 ? (
				<div>
					<Button variant="outline" disabled={revokingOthers} onClick={() => setConfirming(true)}>
						{revokingOthers ? "Signing out…" : "Sign out everywhere else"}
					</Button>
				</div>
			) : null}
			<AlertDialog open={confirming} onOpenChange={setConfirming}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sign out {devices(others)}?</AlertDialogTitle>
						<AlertDialogDescription>
							They need your password to sign in again. A device that is open right now can keep
							working for up to 15 minutes. This device stays signed in.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								setConfirming(false);
								onRevokeOthers();
							}}
						>
							Sign out {devices(others)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
