export type User = {
	id: string;
	email: string;
	createdAt: string;
};

export type UserCredentials = User & { passwordHash: string };

export type AuthSession = {
	id: string;
	userId: string;
	expiresAt: Date;
	revokedAt: Date | null;
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

export interface AuthRepository {
	/** `null` when the email is already registered. */
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
}
