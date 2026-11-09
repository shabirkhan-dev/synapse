export const AUTH_ERROR_CODES = {
	ACCESS_TOKEN_MISSING: "AUTH_ACCESS_TOKEN_MISSING",
	ACCESS_TOKEN_INVALID: "AUTH_ACCESS_TOKEN_INVALID",
	EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
	INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
	REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID",
	USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
	RATE_LIMITED: "AUTH_RATE_LIMITED",
	LINK_INVALID: "AUTH_LINK_INVALID",
	NOT_A_MEMBER: "AUTH_NOT_A_MEMBER",
	ORGANIZATION_NOT_FOUND: "AUTH_ORGANIZATION_NOT_FOUND",
} as const;

export const AUTH_MESSAGES = {
	ACCESS_TOKEN_MISSING: "Missing bearer access token",
	ACCESS_TOKEN_INVALID: "Invalid or expired access token",
	EMAIL_TAKEN: "An account with this email already exists",
	// Same message for an unknown email and a wrong password, so it does not reveal accounts.
	INVALID_CREDENTIALS: "Email or password is incorrect",
	REFRESH_TOKEN_INVALID: "Invalid, expired or revoked refresh token",
	USER_NOT_FOUND: "User not found",
	BODY_TOO_LARGE: "Request body must be 4 KB or smaller",
	SIGNED_UP: "Account created",
	SIGNED_IN: "Signed in",
	REFRESHED: "Tokens refreshed",
	SIGNED_OUT: "Signed out",
	USER_FETCHED: "Current user retrieved",
	RATE_LIMITED: "Too many attempts; try again later",
	LINK_INVALID: "This link is invalid, expired or already used",
	EMAIL_VERIFIED: "Email verified",
	VERIFICATION_SENT: "Verification email sent",
	ALREADY_VERIFIED: "Email already verified",
	// Same answer whether or not the account exists.
	RESET_REQUESTED: "If an account exists for this email, a reset link is on its way",
	PASSWORD_RESET: "Password changed; sign in again",
	NOT_A_MEMBER: "You are no longer a member of this organization; switch organization",
	ORGANIZATION_NOT_FOUND: "Organization not found",
	ORGANIZATION_SWITCHED: "Organization switched",
} as const;

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** Attempts allowed per window. Counted before any password check, so guessing stays slow. */
export const AUTH_RATE_LIMITS = {
	SIGN_IN_PER_EMAIL: { limit: 10, windowSeconds: 15 * MINUTE },
	SIGN_IN_PER_IP: { limit: 100, windowSeconds: 15 * MINUTE },
	SIGN_UP_PER_IP: { limit: 10, windowSeconds: HOUR },
	RESET_REQUEST_PER_EMAIL: { limit: 5, windowSeconds: HOUR },
	RESET_REQUEST_PER_IP: { limit: 20, windowSeconds: HOUR },
	VERIFICATION_EMAIL_PER_USER: { limit: 5, windowSeconds: HOUR },
} as const;

/** How long emailed links stay valid. */
export const AUTH_LINK_TTL_SECONDS = {
	email_verification: 24 * HOUR,
	password_reset: HOUR,
} as const;

/** Console routes the emailed links open (`?token=` is appended). */
export const AUTH_LINK_PATHS = {
	email_verification: "/verify-email",
	password_reset: "/reset-password",
} as const;

/** Client IP when the connection does not expose one (e.g. in-process tests). */
export const UNKNOWN_CLIENT_IP = "unknown";

export const BEARER_PREFIX = "Bearer ";
export const TOKEN_TYPE = "Bearer";

/** Auth bodies are tiny (email, password, token). */
export const AUTH_MAX_BODY_BYTES = 4 * 1024;
