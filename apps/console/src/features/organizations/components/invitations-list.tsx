import { Button } from "@synapse/ui/components/button";

import { ROLE_LABELS } from "../constants/organizations.constants";
import type { Invitation } from "../types/organization.types";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export type InvitationsListProps = {
	invitations: Invitation[];
	busyId: string | null;
	onRevoke: (invitation: Invitation) => void;
};

/** Pending emailed invitations; withdrawing one stops its link from working. */
export function InvitationsList({ invitations, busyId, onRevoke }: InvitationsListProps) {
	if (invitations.length === 0) return null;
	return (
		<section aria-labelledby="pending-invitations" className="flex flex-col gap-2">
			<h3 id="pending-invitations" className="text-sm font-medium">
				Invited, not joined yet
			</h3>
			<ul className="flex flex-col divide-y rounded-lg border">
				{invitations.map((invitation) => (
					<li
						key={invitation.id}
						className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
					>
						<span className="flex min-w-0 flex-col">
							<span className="truncate">{invitation.email}</span>
							<span className="text-xs text-muted-foreground">
								{ROLE_LABELS[invitation.role]} · link works until{" "}
								<time dateTime={invitation.expiresAt}>
									{dateFormat.format(new Date(invitation.expiresAt))}
								</time>
							</span>
						</span>
						<Button
							variant="ghost"
							size="sm"
							className="-me-1.5"
							disabled={busyId === invitation.id}
							aria-label={`Withdraw the invitation to ${invitation.email}`}
							onClick={() => onRevoke(invitation)}
						>
							Withdraw
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}
