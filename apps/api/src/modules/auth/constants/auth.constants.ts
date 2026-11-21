export const AUTH_ERROR_CODES = {
	ACCESS_TOKEN_MISSING: "AUTH_ACCESS_TOKEN_MISSING",
	ACCESS_TOKEN_INVALID: "AUTH_ACCESS_TOKEN_INVALID",
	SESSION_ENDED: "AUTH_SESSION_ENDED",
	EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
	INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
	REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID",
	USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
	RATE_LIMITED: "AUTH_RATE_LIMITED",
	LINK_INVALID: "AUTH_LINK_INVALID",
	NOT_A_MEMBER: "AUTH_NOT_A_MEMBER",
	ORGANIZATION_NOT_FOUND: "AUTH_ORGANIZATION_NOT_FOUND",
	SESSION_NOT_FOUND: "AUTH_SESSION_NOT_FOUND",
	API_KEY_INVALID: "AUTH_API_KEY_INVALID",
	API_KEY_NOT_FOUND: "AUTH_API_KEY_NOT_FOUND",
	TOO_MANY_API_KEYS: "AUTH_TOO_MANY_API_KEYS",
	SESSION_REQUIRED: "AUTH_SESSION_REQUIRED",
	MFA_CODE_INVALID: "AUTH_MFA_CODE_INVALID",
	MFA_CHALLENGE_INVALID: "AUTH_MFA_CHALLENGE_INVALID",
	MFA_NOT_SET_UP: "AUTH_MFA_NOT_SET_UP",
	MFA_ALREADY_ENABLED: "AUTH_MFA_ALREADY_ENABLED",
	MFA_NOT_ENABLED: "AUTH_MFA_NOT_ENABLED",
} as const;

export const AUTH_MESSAGES = {
	ACCESS_TOKEN_MISSING: "Missing bearer access token",
	ACCESS_TOKEN_INVALID: "Invalid or expired access token",
	SESSION_ENDED: "This session was signed out; sign in again",
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
	API_KEY_INVALID: "Invalid, expired or revoked API key",
	API_KEY_NOT_FOUND: "No such API key",
	TOO_MANY_API_KEYS: "You have too many API keys; revoke one first",
	SESSION_REQUIRED: "Sign in to do this; an API key cannot manage keys or sessions",
	API_KEY_CREATED: "API key created; copy it now, it is not shown again",
	API_KEYS_FETCHED: "API keys retrieved",
	API_KEY_REVOKED: "API key revoked",
	MFA_REQUIRED: "Enter the code from your authenticator app",
	MFA_CODE_INVALID: "That code is not right, or was already used; try the newest one",
	MFA_CHALLENGE_INVALID: "This sign-in took too long; enter your password again",
	MFA_NOT_SET_UP: "Start setting up two-step sign-in first",
	MFA_ALREADY_ENABLED: "Two-step sign-in is already on; turn it off first to set it up again",
	MFA_NOT_ENABLED: "Two-step sign-in is not on",
	MFA_STATUS: "Two-step sign-in status",
	MFA_SETUP_STARTED: "Scan the code with your authenticator app, then confirm with a code",
	MFA_ENABLED: "Two-step sign-in is on; keep the recovery codes somewhere safe",
	MFA_DISABLED: "Two-step sign-in is off",
	ORGANIZATION_SWITCHED: "Organization switched",
	SESSIONS_FETCHED: "Sessions retrieved",
	SESSION_REVOKED: "Session signed out",
	OTHER_SESSIONS_REVOKED: "Other sessions signed out",
	SESSION_NOT_FOUND: "No active session with this id",
} as const;

/** Longest `User-Agent` kept on a session; real ones are a few hundred characters. */
export const USER_AGENT_MAX_LENGTH = 512;

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
	/** Second-step codes: six digits are guessable without a tight limit. */
	MFA_CODE_PER_USER: { limit: 5, windowSeconds: 5 * MINUTE },
} as const;

/** The name authenticator apps show next to the account. */
export const MFA_ISSUER = "Synapse";

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

/** Personal API keys start with this, so the auth middleware can tell them from access tokens. */
export const API_KEY_PREFIX = "syn_";
/** Characters of a key kept in clear to tell keys apart (`syn_` + 8). */
export const API_KEY_VISIBLE_CHARS = 12;
/** Keys one user may hold. */
export const MAX_API_KEYS = 20;
/** `last_used_at` is written at most this often per key. */
export const API_KEY_TOUCH_INTERVAL_MS = 60_000;
