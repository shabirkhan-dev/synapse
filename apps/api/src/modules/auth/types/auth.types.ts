import type { OrganizationRole } from "@synapse/security";

export type User = {
	id: string;
	email: string;
	/** ISO time the email was confirmed, or `null` while unverified. */
	emailVerifiedAt: string | null;
	createdAt: string;
};

export type AuthTokenPurpose = "email_verification" | "password_reset";

export type RateLimitRule = { limit: number; windowSeconds: number };

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/** Counts attempts per key in a fixed window; shared by every API instance. */
export interface RateLimiter {
	hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

export type UserCredentials = User & { passwordHash: string };

export type AuthSession = {
	id: string;
	userId: string;
	expiresAt: Date;
	revokedAt: Date | null;
	/** Active organization; `null` = the personal one. */
	organizationId: string | null;
	/** Which hash the presented refresh token matched: `previous` means it was already used. */
	matched: "current" | "previous";
};

export type AuthTokens = {
	tokenType: "Bearer";
	accessToken: string;
	accessTokenExpiresAt: string;
	refreshToken: string;
	refreshTokenExpiresAt: string;
};

export type SignedIn = { user: User; tokens: AuthTokens };

export type SwitchedOrganization = {
	tokenType: "Bearer";
	accessToken: string;
	accessTokenExpiresAt: string;
	organizationId: string;
	role: OrganizationRole;
};

export interface AuthRepository {
	/** Creates the user and their personal organization (same id). `null` if the email exists. */
	createUser(input: { email: string; passwordHash: string }): Promise<User | null>;
	findUserByEmail(email: string): Promise<UserCredentials | null>;
	findUserById(userId: string): Promise<User | null>;
	createSession(input: {
		userId: string;
		refreshTokenHash: string;
		expiresAt: Date;
	}): Promise<{ id: string }>;
	/** The session whose current or previous refresh-token hash equals `hash`. */
	findSessionByRefreshTokenHash(hash: string): Promise<AuthSession | null>;
	/**
	 * Swap `currentHash` for `nextHash` only if it is still current and the session is not revoked;
	 * `false` means another request rotated or revoked it first.
	 */
	rotateRefreshToken(input: {
		sessionId: string;
		currentHash: string;
		nextHash: string;
	}): Promise<boolean>;
	revokeSession(input: { sessionId: string; userId: string }): Promise<void>;
	revokeAllSessions(userId: string): Promise<void>;
	setSessionOrganization(input: {
		sessionId: string;
		userId: string;
		organizationId: string | null;
	}): Promise<void>;
	/** Store a single-use token, voiding any unused one with the same purpose for the user. */
	replaceAuthToken(input: {
		userId: string;
		purpose: AuthTokenPurpose;
		tokenHash: string;
		expiresAt: Date;
	}): Promise<void>;
	/** Mark an unused, unexpired token used; returns its user id, or `null` if it is not valid. */
	consumeAuthToken(input: { purpose: AuthTokenPurpose; tokenHash: string }): Promise<string | null>;
	markEmailVerified(userId: string): Promise<void>;
	updatePasswordHash(input: { userId: string; passwordHash: string }): Promise<void>;
}
