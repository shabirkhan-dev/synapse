export const SSO_ERROR_CODES = {
	NOT_CONFIGURED: "SSO_NOT_CONFIGURED",
	NOT_A_TEAM: "SSO_NOT_A_TEAM",
	CONNECTION_NOT_FOUND: "SSO_CONNECTION_NOT_FOUND",
	SECRET_REQUIRED: "SSO_CLIENT_SECRET_REQUIRED",
	PROVIDER_FAILED: "SSO_PROVIDER_FAILED",
	STATE_INVALID: "SSO_STATE_INVALID",
	SIGN_IN_REJECTED: "SSO_SIGN_IN_REJECTED",
	EMAIL_NOT_ALLOWED: "SSO_EMAIL_NOT_ALLOWED",
	FORBIDDEN: "SSO_FORBIDDEN",
	RATE_LIMITED: "SSO_RATE_LIMITED",
} as const;

export const SSO_MESSAGES = {
	NOT_CONFIGURED: "Single sign-on is not set up for this email's domain; sign in with a password",
	NOT_A_TEAM: "Single sign-on is for teams; create or switch to a team first",
	CONNECTION_NOT_FOUND: "This team has no single sign-on set up",
	SECRET_REQUIRED: "Enter the client secret from your identity provider",
	PROVIDER_FAILED: "The identity provider could not be used",
	STATE_INVALID: "This sign-in expired or was already used; start again from the sign-in page",
	SIGN_IN_REJECTED: "The identity provider's answer could not be verified; start again",
	EMAIL_NOT_ALLOWED:
		"Your identity provider did not confirm an email address in one of this team's domains",
	FORBIDDEN: "Only the team's owners can change single sign-on",
	RATE_LIMITED: "Too many attempts; try again later",
	DOMAIN_INVALID: "Enter a domain such as example.com",
	CONNECTION_FETCHED: "Single sign-on settings",
	CONNECTION_SAVED: "Single sign-on saved; verify each domain before people can use it",
	CONNECTION_DELETED: "Single sign-on turned off",
	DOMAINS_CHECKED: "Domains checked",
	SIGN_IN_STARTED: "Continue at your identity provider",
	SIGNED_IN: "Signed in with single sign-on",
} as const;

const MINUTE = 60;

export const SSO_LIMITS = {
	/** How long the trip to the identity provider and back may take. */
	STATE_TTL_SECONDS: 10 * MINUTE,
	MAX_DOMAINS: 10,
	/** Starting a sign-in reveals whether a domain has SSO, so it is limited like sign-in. */
	START_PER_IP: { limit: 30, windowSeconds: 15 * MINUTE },
} as const;

/** The DNS TXT record that proves a team controls a domain: `<prefix>.<domain>`. */
export const SSO_DNS_RECORD_PREFIX = "_synapse-verification";

/** httpOnly cookie that ties a sign-in to the browser that started it. */
export const SSO_BROWSER_COOKIE = "synapse_sso";
