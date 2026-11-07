import type { EmailMessage } from "@synapse/core/contracts";

export function verificationEmail(to: string, link: string): EmailMessage {
	return {
		to,
		subject: "Confirm your Synapse email",
		text: `Confirm your email address by opening this link (valid for 24 hours):\n\n${link}\n\nIf you did not create a Synapse account, ignore this email.`,
	};
}

export function passwordResetEmail(to: string, link: string): EmailMessage {
	return {
		to,
		subject: "Reset your Synapse password",
		text: `Choose a new password by opening this link (valid for 1 hour):\n\n${link}\n\nIf you did not ask for this, ignore this email; your password stays the same.`,
	};
}
