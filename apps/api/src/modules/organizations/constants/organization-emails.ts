import type { EmailMessage } from "@synapse/core/contracts";

import { INVITATION_TTL_DAYS } from "./organizations.constants";

export function invitationEmail(to: string, team: string, link: string): EmailMessage {
	return {
		to,
		subject: `You're invited to ${team} on Synapse`,
		text: `You have been invited to join the team "${team}" on Synapse.\n\nOpen this link to accept (valid for ${INVITATION_TTL_DAYS} days). If you have no account yet, create one with this email address first:\n\n${link}\n\nIf you were not expecting this, ignore this email.`,
	};
}
