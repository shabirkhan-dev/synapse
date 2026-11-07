import type { Env } from "./env";

const SECONDS_PER_DAY = 86_400;

export type AuthConfig = {
	/** HS256 secret for access tokens. */
	jwtSecret: string;
	accessTokenTtlSeconds: number;
	/** How long a session (and its refresh tokens) lives after sign-in. */
	sessionTtlSeconds: number;
	/** Base URL for links in auth emails (the console). */
	appUrl: string;
	/** Take the client IP from `x-forwarded-for` (rate limits). */
	trustProxy: boolean;
};

export function createAuthConfig(env: Env): AuthConfig {
	return {
		jwtSecret: env.JWT_SECRET,
		accessTokenTtlSeconds: env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
		sessionTtlSeconds: env.AUTH_SESSION_TTL_DAYS * SECONDS_PER_DAY,
		appUrl: env.APP_URL.replace(/\/$/, ""),
		trustProxy: env.TRUST_PROXY,
	};
}
