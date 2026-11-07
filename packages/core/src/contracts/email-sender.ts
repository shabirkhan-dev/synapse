/** How domain code sends email. Implemented in `@synapse/adapters/email` (Resend). */
export interface EmailMessage {
	to: string;
	subject: string;
	/** Plain-text body; always sent. */
	text: string;
	html?: string;
}

export interface EmailSender {
	/** Resolves once the provider accepted the message; throws `EMAIL_SEND_FAILED` otherwise. */
	send(message: EmailMessage): Promise<void>;
}
