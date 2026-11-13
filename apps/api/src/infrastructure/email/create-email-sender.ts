import { createResendEmailSender } from "@synapse/adapters/email";
import type { EmailSender } from "@synapse/core/contracts";
import type { Logger } from "@synapse/observability";
import { createCallPolicy } from "@synapse/reliability";

import type { EmailConfig, ReliabilityConfig } from "@/config";
import { reportReliabilityEvent } from "@/infrastructure/models/create-model-gateway";
import type { CircuitStatus } from "@/infrastructure/reliability/circuit-status";

/**
 * Resend when a key is configured. Without one (development only: production config requires the
 * key) the message is logged so links can be opened locally — never do this with real users.
 * Resend calls retry 429/5xx and network failures, behind their own circuit breaker.
 */
export function createEmailSender(
	config: EmailConfig,
	reliability: ReliabilityConfig,
	logger: Logger,
	circuits?: CircuitStatus,
): EmailSender {
	if (config.resendApiKey) {
		const resend = createResendEmailSender({ apiKey: config.resendApiKey, from: config.from });
		const policy = createCallPolicy({
			name: "email",
			retry: reliability.retry,
			breaker: reliability.breaker,
			onEvent: reportReliabilityEvent(logger, circuits),
		});
		return { send: (message) => policy.run(() => resend.send(message)) };
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
