import { createResendEmailSender } from "@synapse/adapters/email";
import type { EmailSender } from "@synapse/core/contracts";
import type { Logger } from "@synapse/observability";

import type { EmailConfig } from "@/config";

/**
 * Resend when a key is configured. Without one (development only: production config requires the
 * key) the message is logged so links can be opened locally — never do this with real users.
 */
export function createEmailSender(config: EmailConfig, logger: Logger): EmailSender {
	if (config.resendApiKey) {
		return createResendEmailSender({ apiKey: config.resendApiKey, from: config.from });
	}
	return {
		async send({ to, subject, text }) {
			logger.warn("email not sent (no RESEND_API_KEY); logged for development", {
				to,
				subject,
				text,
			});
		},
	};
}
