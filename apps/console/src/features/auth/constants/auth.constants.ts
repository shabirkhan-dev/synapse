/** Same as the API's `PASSWORD_POLICY` (`@synapse/security`), checked here for quick feedback. */
export const PASSWORD_RULES = { MIN: 12, MAX: 128 } as const;

/** Console routes, including the two the API's emails link to (`AUTH_LINK_PATHS`). */
export const AUTH_ROUTES = {
	SIGN_IN: "/sign-in",
	SIGN_UP: "/sign-up",
	FORGOT_PASSWORD: "/forgot-password",
	RESET_PASSWORD: "/reset-password",
	VERIFY_EMAIL: "/verify-email",
	HOME: "/documents",
} as const;
