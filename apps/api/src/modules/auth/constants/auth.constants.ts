export const AUTH_ERROR_CODES = {
	ACCESS_TOKEN_MISSING: "AUTH_ACCESS_TOKEN_MISSING",
	ACCESS_TOKEN_INVALID: "AUTH_ACCESS_TOKEN_INVALID",
	EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
	INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
	REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID",
	USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
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
} as const;

export const BEARER_PREFIX = "Bearer ";
export const TOKEN_TYPE = "Bearer";

/** Auth bodies are tiny (email, password, token). */
export const AUTH_MAX_BODY_BYTES = 4 * 1024;
