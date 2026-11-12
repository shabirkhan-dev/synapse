import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import type { EmailMessage, EmailSender } from "@synapse/core/contracts";
import { isSynapseError } from "@synapse/core/errors";
import type { Logger } from "@synapse/observability";
import {
	type AccessTokens,
	createAccessTokens,
	createSecretToken,
	hashPassword,
	hashSecretToken,
	type OrganizationRole,
	SECURITY_ERROR_CODES,
	verifyPassword,
	verifyPasswordAgainstNothing,
} from "@synapse/security";

import type { AuthConfig } from "@/config";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser, RequestContext } from "@/shared/types/app-types";

import { passwordResetEmail, verificationEmail } from "../constants/auth-emails";
import {
	AUTH_ERROR_CODES,
	AUTH_LINK_PATHS,
	AUTH_LINK_TTL_SECONDS,
	AUTH_MESSAGES,
	AUTH_RATE_LIMITS,
	TOKEN_TYPE,
} from "../constants/auth.constants";
import type {
	AuthRepository,
	AuthSession,
	AuthTokenPurpose,
	AuthTokens,
	CurrentUser,
	RateLimiter,
	RateLimitRule,
	SignedIn,
	SwitchedOrganization,
	User,
} from "../types/auth.types";

export type Credentials = { email: string; password: string };

export type AuthServiceDependencies = {
	repository: AuthRepository;
	rateLimiter: RateLimiter;
	email: EmailSender;
	logger: Logger;
	config: AuthConfig;
	/** Sign-ups, sign-ins, sign-outs, verifications and resets are recorded here. */
	audit: AuditLog;
	/** The user's role in an organization (organizations module), `null` if not a member. */
	roleOf: (organizationId: string, userId: string) => Promise<OrganizationRole | null>;
};

const NO_REQUEST: RequestContext = { requestId: null };

/**
 * Accounts and sessions. Access tokens are short-lived JWTs (`sub` = user, `sid` = session) checked
 * by signature only; refresh tokens are opaque, stored hashed, and rotate on every use. Reusing an
 * already-rotated refresh token revokes the whole session (it was copied). Sign-in, sign-up and
 * reset requests are rate limited before any password work; emailed links are single-use.
 */
export class AuthService {
	private readonly repository: AuthRepository;
	private readonly rateLimiter: RateLimiter;
	private readonly email: EmailSender;
	private readonly logger: Logger;
	private readonly config: AuthConfig;
	private readonly audit: AuditLog;
	private readonly accessTokens: AccessTokens;

	private readonly roleOf: AuthServiceDependencies["roleOf"];

	constructor({
		repository,
		rateLimiter,
		email,
		logger,
		config,
		audit,
		roleOf,
	}: AuthServiceDependencies) {
		this.audit = audit;
		this.roleOf = roleOf;
		this.repository = repository;
		this.rateLimiter = rateLimiter;
		this.email = email;
		this.logger = logger;
		this.config = config;
		this.accessTokens = createAccessTokens({
			secret: config.jwtSecret,
			ttlSeconds: config.accessTokenTtlSeconds,
		});
	}

	async signUp(
		{ email, password }: Credentials,
		ip: string,
		context: RequestContext = NO_REQUEST,
	): Promise<SignedIn> {
		await this.limit(`sign-up:ip:${ip}`, AUTH_RATE_LIMITS.SIGN_UP_PER_IP);
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
		await this.sendLink(user, "email_verification");
		const tokens = await this.startSession(user.id);
		await this.record(AUDIT_ACTIONS.AUTH_SIGNED_UP, user.id, context);
		return { user, tokens };
	}

	async signIn(
		{ email, password }: Credentials,
		ip: string,
		context: RequestContext = NO_REQUEST,
	): Promise<SignedIn> {
		const normalized = normalizeEmail(email);
		await this.limit(`sign-in:ip:${ip}`, AUTH_RATE_LIMITS.SIGN_IN_PER_IP);
		await this.limit(`sign-in:email:${normalized}`, AUTH_RATE_LIMITS.SIGN_IN_PER_EMAIL);
		const account = await this.repository.findUserByEmail(normalized);
		const valid = account
			? await verifyPassword(password, account.passwordHash)
			: await verifyPasswordAgainstNothing(password);
		if (!account || !valid) {
			throw unauthorized(AUTH_ERROR_CODES.INVALID_CREDENTIALS, AUTH_MESSAGES.INVALID_CREDENTIALS);
		}
		const { passwordHash: _passwordHash, ...user } = account;
		const tokens = await this.startSession(user.id);
		await this.record(AUDIT_ACTIONS.AUTH_SIGNED_IN, user.id, context);
		return { user, tokens };
	}

	/**
	 * Swap a refresh token for new tokens (rotation). Presenting the token that was just replaced
	 * within `refreshReuseGraceSeconds` of its rotation (two tabs, a retried request) gets an access
	 * token only — no new refresh token, so nothing forks; later it means the token was copied, and
	 * the session is revoked.
	 */
	async refresh(refreshToken: string, now = new Date()): Promise<AuthTokens> {
		const currentHash = hashSecretToken(refreshToken);
		const session = await this.repository.findSessionByRefreshTokenHash(currentHash);
		if (!session || session.revokedAt || session.expiresAt <= now) throw invalidRefreshToken();
		if (session.matched === "previous") return this.replayed(session, now);

		const nextToken = createSecretToken();
		const rotated = await this.repository.rotateRefreshToken({
			sessionId: session.id,
			currentHash,
			nextHash: hashSecretToken(nextToken),
		});
		if (!rotated) {
			// A concurrent refresh with the same token won the rotation: this one is now a replay.
			const after = await this.repository.findSessionByRefreshTokenHash(currentHash);
			if (!after || after.revokedAt || after.matched !== "previous") throw invalidRefreshToken();
			return this.replayed(after, now);
		}
		const organizationId = await this.activeOrganization(session);
		return this.tokens(session.userId, session.id, nextToken, session.expiresAt, organizationId);
	}

	/** The replaced token came back: an access token inside the grace window, revocation after it. */
	private async replayed(session: AuthSession, now: Date): Promise<AuthTokens> {
		const graceMs = this.config.refreshReuseGraceSeconds * 1000;
		const withinGrace =
			session.rotatedAt !== null && now.getTime() - session.rotatedAt.getTime() <= graceMs;
		if (!withinGrace) {
			await this.repository.revokeSession({ sessionId: session.id, userId: session.userId });
			throw invalidRefreshToken();
		}
		const organizationId = await this.activeOrganization(session);
		const access = await this.accessTokens.issue(
			claims(session.userId, session.id, organizationId),
		);
		return {
			tokenType: TOKEN_TYPE,
			accessToken: access.token,
			accessTokenExpiresAt: access.expiresAt.toISOString(),
		};
	}

	/** Back to the personal organization if the user has left the session's one. */
	private async activeOrganization(session: AuthSession): Promise<string> {
		return session.organizationId && (await this.roleOf(session.organizationId, session.userId))
			? session.organizationId
			: session.userId;
	}

	/**
	 * Make another organization (one the user belongs to) active for this session. Returns a new
	 * access token for it; the refresh token keeps working and refreshes into the same organization.
	 */
	async switchOrganization(
		user: AuthUser,
		organizationId: string,
		context: RequestContext = NO_REQUEST,
	): Promise<SwitchedOrganization> {
		const role = await this.roleOf(organizationId, user.sub);
		if (!role) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: AUTH_ERROR_CODES.ORGANIZATION_NOT_FOUND,
				message: AUTH_MESSAGES.ORGANIZATION_NOT_FOUND,
			});
		}
		await this.repository.setSessionOrganization({
			sessionId: user.sid,
			userId: user.sub,
			organizationId: organizationId === user.sub ? null : organizationId,
		});
		const access = await this.accessTokens.issue(claims(user.sub, user.sid, organizationId));
		await this.record(AUDIT_ACTIONS.AUTH_ORGANIZATION_SWITCHED, user.sub, context, {
			organizationId,
		});
		return {
			tokenType: TOKEN_TYPE,
			accessToken: access.token,
			accessTokenExpiresAt: access.expiresAt.toISOString(),
			organizationId,
			role,
		};
	}

	async signOut({ sub, sid }: AuthUser, context: RequestContext = NO_REQUEST): Promise<void> {
		await this.repository.revokeSession({ sessionId: sid, userId: sub });
		await this.record(AUDIT_ACTIONS.AUTH_SIGNED_OUT, sub, context, { sessionId: sid });
	}

	/** The user and the organization their token acts in (role read on this request). */
	async me(caller: AuthUser): Promise<CurrentUser> {
		const user = await this.currentUser(caller);
		return { ...user, organization: { id: caller.orgId, role: caller.role } };
	}

	currentUser({ sub }: AuthUser): Promise<User> {
		return this.findUser(sub);
	}

	private async findUser(userId: string): Promise<User> {
		const user = await this.repository.findUserById(userId);
		if (!user) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: AUTH_ERROR_CODES.USER_NOT_FOUND,
				message: AUTH_MESSAGES.USER_NOT_FOUND,
			});
		}
		return user;
	}

	async verifyEmail(token: string, context: RequestContext = NO_REQUEST): Promise<User> {
		const userId = await this.consumeLink("email_verification", token);
		await this.repository.markEmailVerified(userId);
		await this.record(AUDIT_ACTIONS.AUTH_EMAIL_VERIFIED, userId, context);
		return this.findUser(userId);
	}

	/** Send a new verification link; `false` when the email is already verified. */
	async resendVerification(caller: AuthUser): Promise<boolean> {
		const user = await this.currentUser(caller);
		if (user.emailVerifiedAt) {
			return false;
		}
		await this.limit(`verify:user:${user.id}`, AUTH_RATE_LIMITS.VERIFICATION_EMAIL_PER_USER);
		await this.sendLink(user, "email_verification");
		return true;
	}

	/**
	 * Email a reset link if the account exists. The caller always gets the same answer, and the email
	 * goes out in the background, so neither the response nor its timing reveals the account.
	 */
	async requestPasswordReset(email: string, ip: string): Promise<void> {
		const normalized = normalizeEmail(email);
		await this.limit(`reset:ip:${ip}`, AUTH_RATE_LIMITS.RESET_REQUEST_PER_IP);
		await this.limit(`reset:email:${normalized}`, AUTH_RATE_LIMITS.RESET_REQUEST_PER_EMAIL);
		const account = await this.repository.findUserByEmail(normalized);
		if (account) {
			this.sendLink(account, "password_reset").catch((error: unknown) => {
				this.logger.error("password reset link failed", { userId: account.id, error });
			});
		}
	}

	/** Set a new password from an emailed link; every session of the user is signed out. */
	async resetPassword(
		token: string,
		password: string,
		context: RequestContext = NO_REQUEST,
	): Promise<void> {
		const userId = await this.consumeLink("password_reset", token);
		await this.repository.updatePasswordHash({
			userId,
			passwordHash: await hashPassword(password),
		});
		// Opening the link proved the inbox is theirs.
		await this.repository.markEmailVerified(userId);
		await this.repository.revokeAllSessions(userId);
		await this.record(AUDIT_ACTIONS.AUTH_PASSWORD_RESET, userId, context);
	}

	/** Verify a bearer access token (signature, algorithm, expiry, `sub` + `sid`). */
	async authenticate(token: string): Promise<AuthUser> {
		let verified: { sub: string; sid: string; org?: string };
		try {
			verified = await this.accessTokens.verify(token);
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
		const orgId = verified.org ?? verified.sub;
		// Checked on every request, so a removed member loses access immediately.
		const role = await this.roleOf(orgId, verified.sub);
		if (!role) {
			throw unauthorized(AUTH_ERROR_CODES.NOT_A_MEMBER, AUTH_MESSAGES.NOT_A_MEMBER);
		}
		return { sub: verified.sub, sid: verified.sid, orgId, role };
	}

	/** Account events: owner, actor and subject are the user. */
	private async record(
		action: string,
		userId: string,
		context: RequestContext,
		data: Record<string, unknown> = {},
	): Promise<void> {
		await this.audit.record({
			ownerId: userId,
			actorId: userId,
			action,
			subjectType: "user",
			subjectId: userId,
			requestId: context.requestId,
			data,
			provenance: null,
		});
	}

	/** Count an attempt; throws `429 AUTH_RATE_LIMITED` once the window's limit is passed. */
	private async limit(key: string, rule: RateLimitRule): Promise<void> {
		// Hashed so the table never holds raw emails or IPs.
		const { allowed, retryAfterSeconds } = await this.rateLimiter.hit(hashSecretToken(key), rule);
		if (!allowed) {
			throw new AppError({
				statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
				code: AUTH_ERROR_CODES.RATE_LIMITED,
				message: AUTH_MESSAGES.RATE_LIMITED,
				details: [{ retryAfterSeconds }],
			});
		}
	}

	/**
	 * Store a fresh single-use link (voiding older ones) and email it. A failed send is logged, not
	 * thrown: the account action already happened and the user can ask for another link.
	 */
	private async sendLink(user: User, purpose: AuthTokenPurpose): Promise<void> {
		const token = createSecretToken();
		await this.repository.replaceAuthToken({
			userId: user.id,
			purpose,
			tokenHash: hashSecretToken(token),
			expiresAt: new Date(Date.now() + AUTH_LINK_TTL_SECONDS[purpose] * 1000),
		});
		const link = `${this.config.appUrl}${AUTH_LINK_PATHS[purpose]}?token=${token}`;
		const message: EmailMessage =
			purpose === "password_reset"
				? passwordResetEmail(user.email, link)
				: verificationEmail(user.email, link);
		try {
			await this.email.send(message);
		} catch (error) {
			this.logger.error("auth email failed", { purpose, userId: user.id, error });
		}
	}

	private async consumeLink(purpose: AuthTokenPurpose, token: string): Promise<string> {
		const userId = await this.repository.consumeAuthToken({
			purpose,
			tokenHash: hashSecretToken(token),
		});
		if (!userId) {
			throw new AppError({
				statusCode: HTTP_STATUS.BAD_REQUEST,
				code: AUTH_ERROR_CODES.LINK_INVALID,
				message: AUTH_MESSAGES.LINK_INVALID,
			});
		}
		return userId;
	}

	private async startSession(userId: string): Promise<AuthTokens> {
		const refreshToken = createSecretToken();
		const expiresAt = new Date(Date.now() + this.config.sessionTtlSeconds * 1000);
		const { id } = await this.repository.createSession({
			userId,
			refreshTokenHash: hashSecretToken(refreshToken),
			expiresAt,
		});
		return this.tokens(userId, id, refreshToken, expiresAt);
	}

	private async tokens(
		userId: string,
		sessionId: string,
		refreshToken: string,
		refreshTokenExpiresAt: Date,
		organizationId: string = userId,
	): Promise<AuthTokens> {
		const access = await this.accessTokens.issue(claims(userId, sessionId, organizationId));
		return {
			tokenType: TOKEN_TYPE,
			accessToken: access.token,
			accessTokenExpiresAt: access.expiresAt.toISOString(),
			refreshToken,
			refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
		};
	}
}

/** The personal organization is implied (no `org` claim), so tokens minted before stay valid. */
function claims(sub: string, sid: string, organizationId: string) {
	return organizationId === sub ? { sub, sid } : { sub, sid, org: organizationId };
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
