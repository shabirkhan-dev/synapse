import type { Env } from "./env";

const SECONDS_PER_DAY = 86_400;
const REFRESH_COOKIE_NAME = "synapse_refresh";

export type AuthConfig = {
	/** HS256 secret for access tokens. */
	jwtSecret: string;
	accessTokenTtlSeconds: number;
	/** How long a session (and its refresh tokens) lives after sign-in. */
	sessionTtlSeconds: number;
	/** Seconds the replaced refresh token still gets an access token (not a new refresh token). */
	refreshReuseGraceSeconds: number;
	/** Base URL for links in auth emails (the console). */
	appUrl: string;
	/** Take the client IP from `x-forwarded-for` (rate limits). */
	trustProxy: boolean;
	/** The console's refresh-token cookie (ADR-0007): sent only to the auth routes. */
	cookie: { name: string; path: string; secure: boolean };
};

export function createAuthConfig(env: Env): AuthConfig {
	return {
		jwtSecret: env.JWT_SECRET,
		accessTokenTtlSeconds: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
		sessionTtlSeconds: env.AUTH_SESSION_TTL_DAYS * SECONDS_PER_DAY,
		refreshReuseGraceSeconds: env.AUTH_REFRESH_REUSE_GRACE_SECONDS,
		appUrl: env.APP_URL.replace(/\/$/, ""),
		trustProxy: env.TRUST_PROXY,
		cookie: {
			name: REFRESH_COOKIE_NAME,
			path: `/${env.API_PREFIX}/v${env.API_VERSION}/auth`,
			secure: env.AUTH_COOKIE_SECURE
				? env.AUTH_COOKIE_SECURE === "true"
				: env.NODE_ENV === "production",
		},
	};
}
