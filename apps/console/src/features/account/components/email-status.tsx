import { Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Badge } from "@synapse/ui/components/badge";
import { Button } from "@synapse/ui/components/button";

import { VERIFICATION_LINK_HOURS } from "../constants/account.constants";

export type EmailStatusProps = {
	email: string;
	verifiedAt: string | null;
	sending: boolean;
	sent: boolean;
	error: string | null;
	onResend: () => void;
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** The account's email and whether it is verified, with a way to get a new link. */
export function EmailStatus({
	email,
	verifiedAt,
	sending,
	sent,
	error,
	onResend,
}: EmailStatusProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm font-medium break-all">{email}</span>
				{verifiedAt ? (
					<Badge variant="outline">
						<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} aria-hidden="true" />
						Verified
					</Badge>
				) : (
					<Badge variant="secondary">
						<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden="true" />
						Not verified
					</Badge>
				)}
			</div>
			{verifiedAt ? (
				<p className="text-xs text-muted-foreground">
					Verified on <time dateTime={verifiedAt}>{dateFormat.format(new Date(verifiedAt))}</time>.
				</p>
			) : (
				<>
					<p className="max-w-prose text-xs text-muted-foreground text-pretty">
						Open the link we emailed when you signed up. Links work for {VERIFICATION_LINK_HOURS}{" "}
						hours; send a new one if yours expired or never arrived.
					</p>
					<div>
						<Button variant="outline" disabled={sending} onClick={onResend}>
							{sending ? "Sending…" : "Send a new link"}
						</Button>
					</div>
				</>
			)}
			<p role="status" className="text-xs text-muted-foreground empty:sr-only">
				{sent && !verifiedAt ? `Sent. Check ${email} for the new link.` : ""}
			</p>
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>The link was not sent</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
