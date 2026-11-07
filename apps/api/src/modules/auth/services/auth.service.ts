import { isSynapseError } from "@synapse/core/errors";
import {
	type AccessTokens,
	createAccessTokens,
	createRefreshToken,
	hashPassword,
	hashRefreshToken,
	SECURITY_ERROR_CODES,
	verifyPassword,
	verifyPasswordAgainstNothing,
} from "@synapse/security";

import type { AuthConfig } from "@/config";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser } from "@/shared/types/app-types";

import { AUTH_ERROR_CODES, AUTH_MESSAGES, TOKEN_TYPE } from "../constants/auth.constants";
import type { AuthRepository, AuthTokens, SignedIn, User } from "../types/auth.types";

export type Credentials = { email: string; password: string };

/**
 * Accounts and sessions. Access tokens are short-lived JWTs (`sub` = user, `sid` = session) checked
 * by signature only; refresh tokens are opaque, stored hashed, and rotate on every use. Reusing an
 * already-rotated refresh token revokes the whole session (it was copied).
 */
export class AuthService {
	private readonly accessTokens: AccessTokens;

	constructor(
		private readonly repository: AuthRepository,
		private readonly config: AuthConfig,
	) {
		this.accessTokens = createAccessTokens({
			secret: config.jwtSecret,
			ttlSeconds: config.accessTokenTtlSeconds,
		});
	}

	async signUp({ email, password }: Credentials): Promise<SignedIn> {
		const user = await this.repository.createUser({
			email: normalizeEmail(email),
			passwordHash: await hashPassword(password),
		});
		if (!user) {
			throw new AppError({
				statusCode: HTTP_STATUS.CONFLICT,
				code: AUTH_ERROR_CODES.EMAIL_TAKEN,
				message: AUTH_MESSAGES.EMAIL_TAKEN,
			});
		}
		return { user, tokens: await this.startSession(user.id) };
	}

	async signIn({ email, password }: Credentials): Promise<SignedIn> {
		const account = await this.repository.findUserByEmail(normalizeEmail(email));
		const valid = account
			? await verifyPassword(password, account.passwordHash)
			: await verifyPasswordAgainstNothing(password);
		if (!account || !valid) {
			throw unauthorized(AUTH_ERROR_CODES.INVALID_CREDENTIALS, AUTH_MESSAGES.INVALID_CREDENTIALS);
		}
		const { passwordHash: _passwordHash, ...user } = account;
		return { user, tokens: await this.startSession(user.id) };
	}

	async refresh(refreshToken: string, now = new Date()): Promise<AuthTokens> {
		const currentHash = hashRefreshToken(refreshToken);
		const session = await this.repository.findSessionByRefreshTokenHash(currentHash);
		if (session?.matched === "previous") {
			await this.repository.revokeSession({ sessionId: session.id, userId: session.userId });
		}
		if (
			!session ||
			session.matched === "previous" ||
			session.revokedAt ||
			session.expiresAt <= now
		) {
			throw invalidRefreshToken();
		}
		const nextToken = createRefreshToken();
		const rotated = await this.repository.rotateRefreshToken({
			sessionId: session.id,
			currentHash,
			nextHash: hashRefreshToken(nextToken),
		});
		if (!rotated) {
			throw invalidRefreshToken();
		}
		return this.tokens(session.userId, session.id, nextToken, session.expiresAt);
	}

	signOut({ sub, sid }: AuthUser): Promise<void> {
		return this.repository.revokeSession({ sessionId: sid, userId: sub });
	}

	async currentUser({ sub }: AuthUser): Promise<User> {
		const user = await this.repository.findUserById(sub);
		if (!user) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: AUTH_ERROR_CODES.USER_NOT_FOUND,
				message: AUTH_MESSAGES.USER_NOT_FOUND,
			});
		}
		return user;
	}

	/** Verify a bearer access token (signature, algorithm, expiry, `sub` + `sid`). */
	async authenticate(token: string): Promise<AuthUser> {
		try {
			return await this.accessTokens.verify(token);
		} catch (error) {
			if (isSynapseError(error) && error.code === SECURITY_ERROR_CODES.ACCESS_TOKEN_INVALID) {
				throw unauthorized(
					AUTH_ERROR_CODES.ACCESS_TOKEN_INVALID,
					AUTH_MESSAGES.ACCESS_TOKEN_INVALID,
					error,
				);
			}
			throw error;
		}
	}

	private async startSession(userId: string): Promise<AuthTokens> {
		const refreshToken = createRefreshToken();
		const expiresAt = new Date(Date.now() + this.config.sessionTtlSeconds * 1000);
		const { id } = await this.repository.createSession({
			userId,
			refreshTokenHash: hashRefreshToken(refreshToken),
			expiresAt,
		});
		return this.tokens(userId, id, refreshToken, expiresAt);
	}

	private async tokens(
		userId: string,
		sessionId: string,
		refreshToken: string,
		refreshTokenExpiresAt: Date,
	): Promise<AuthTokens> {
		const access = await this.accessTokens.issue({ sub: userId, sid: sessionId });
		return {
			tokenType: TOKEN_TYPE,
			accessToken: access.token,
			accessTokenExpiresAt: access.expiresAt.toISOString(),
			refreshToken,
			refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
		};
	}
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function invalidRefreshToken(): AppError {
	return unauthorized(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID, AUTH_MESSAGES.REFRESH_TOKEN_INVALID);
}

function unauthorized(code: string, message: string, cause?: unknown): AppError {
	return new AppError({ statusCode: HTTP_STATUS.UNAUTHORIZED, code, message, cause });
}
