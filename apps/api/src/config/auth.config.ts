import type { Env } from "./env";

export type AuthConfig = {
	/** HS256 secret for access tokens. */
	jwtSecret: string;
};

export function createAuthConfig(env: Env): AuthConfig {
	return { jwtSecret: env.JWT_SECRET };
}
