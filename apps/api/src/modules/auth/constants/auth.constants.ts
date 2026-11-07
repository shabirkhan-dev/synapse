export const AUTH_ERROR_CODES = {
	ACCESS_TOKEN_MISSING: "AUTH_ACCESS_TOKEN_MISSING",
	ACCESS_TOKEN_INVALID: "AUTH_ACCESS_TOKEN_INVALID",
} as const;

export const AUTH_MESSAGES = {
	ACCESS_TOKEN_MISSING: "Missing bearer access token",
	ACCESS_TOKEN_INVALID: "Invalid or expired access token",
} as const;

export const BEARER_PREFIX = "Bearer ";
