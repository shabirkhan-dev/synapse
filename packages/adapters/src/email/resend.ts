import type { EmailMessage, EmailSender } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

export const EMAIL_ERROR_CODES = { SEND_FAILED: "EMAIL_SEND_FAILED" } as const;

export type ResendEmailSenderOptions = {
	apiKey: string;
	/** Verified sender, e.g. `Synapse <auth@example.com>`. */
	from: string;
	baseUrl?: string;
	timeoutMs?: number;
	fetch?: typeof fetch;
};

/** Sends through Resend's HTTP API (`POST /emails`); no SDK needed. */
export function createResendEmailSender({
	apiKey,
	from,
	baseUrl = "https://api.resend.com",
	timeoutMs = 10_000,
	fetch: fetchImpl = fetch,
}: ResendEmailSenderOptions): EmailSender {
	return {
		async send({ to, subject, text, html }: EmailMessage) {
			let response: Response;
			try {
				response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/emails`, {
					method: "POST",
					headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
					body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }),
					signal: AbortSignal.timeout(timeoutMs),
				});
			} catch (cause) {
				throw new SynapseError(EMAIL_ERROR_CODES.SEND_FAILED, "Email provider unreachable", {
					cause,
				});
			}
			if (!response.ok) {
				// Resend error bodies name the problem (e.g. unverified domain) and never echo the key.
				const detail = await response.text().catch(() => "");
				throw new SynapseError(
					EMAIL_ERROR_CODES.SEND_FAILED,
					`Email provider rejected the message (${response.status})`,
					{ details: [detail.slice(0, 500)] },
				);
			}
		},
	};
}
