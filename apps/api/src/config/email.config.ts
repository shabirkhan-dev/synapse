import type { Env } from "./env";

export type EmailConfig = {
	/** Unset outside production: emails are logged instead of sent. */
	resendApiKey?: string;
	from: string;
};

export function createEmailConfig(env: Env): EmailConfig {
	return {
		...(env.RESEND_API_KEY ? { resendApiKey: env.RESEND_API_KEY } : {}),
		from: env.EMAIL_FROM,
	};
}
