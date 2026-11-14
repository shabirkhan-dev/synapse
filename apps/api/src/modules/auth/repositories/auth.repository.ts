import { and, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";

import {
	authSessions,
	authTokens,
	type Database,
	organizationMembers,
	organizations,
	users,
} from "@synapse/database";

import { toUser, toUserCredentials } from "../mappers/auth.mapper";
import type {
	ActiveSession,
	AuthRepository,
	AuthSession,
	AuthTokenPurpose,
	User,
	UserCredentials,
} from "../types/auth.types";

export class DrizzleAuthRepository implements AuthRepository {
	constructor(private readonly db: Database) {}

	async createUser({
		email,
		passwordHash,
	}: {
		email: string;
		passwordHash: string;
	}): Promise<User | null> {
		return this.db.transaction(async (tx) => {
			const [row] = await tx
				.insert(users)
				.values({ email, passwordHash })
				.onConflictDoNothing({ target: users.email })
				.returning();
			if (!row) {
				return null;
			}
			// The personal organization shares the user's id (see organizations schema).
			await tx.insert(organizations).values({ id: row.id, name: "Personal", kind: "personal" });
			await tx
				.insert(organizationMembers)
				.values({ organizationId: row.id, userId: row.id, role: "owner" });
			return toUser(row);
		});
	}

	async findUserByEmail(email: string): Promise<UserCredentials | null> {
		const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
		return row ? toUserCredentials(row) : null;
	}

	async findUserById(userId: string): Promise<User | null> {
		const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
		return row ? toUser(row) : null;
	}

	async createSession(input: {
		userId: string;
		refreshTokenHash: string;
		expiresAt: Date;
		userAgent: string | null;
	}): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(authSessions)
			.values(input)
			.returning({ id: authSessions.id });
		if (!row) {
			throw new Error("Failed to insert auth session");
		}
		return row;
	}

	async isSessionActive({
		sessionId,
		userId,
	}: {
		sessionId: string;
		userId: string;
	}): Promise<boolean> {
		const [row] = await this.db
			.select({ id: authSessions.id })
			.from(authSessions)
			.where(
				and(
					eq(authSessions.id, sessionId),
					eq(authSessions.userId, userId),
					isNull(authSessions.revokedAt),
					gt(authSessions.expiresAt, sql`now()`),
				),
			)
			.limit(1);
		return row !== undefined;
	}

	async listActiveSessions(userId: string): Promise<ActiveSession[]> {
		const rows = await this.db
			.select({
				id: authSessions.id,
				userAgent: authSessions.userAgent,
				createdAt: authSessions.createdAt,
				updatedAt: authSessions.updatedAt,
				expiresAt: authSessions.expiresAt,
			})
			.from(authSessions)
			.where(
				and(
					eq(authSessions.userId, userId),
					isNull(authSessions.revokedAt),
					gt(authSessions.expiresAt, sql`now()`),
				),
			)
			.orderBy(desc(authSessions.updatedAt))
			.limit(50);
		return rows.map((row) => ({
			id: row.id,
			userAgent: row.userAgent,
			createdAt: row.createdAt.toISOString(),
			lastActiveAt: row.updatedAt.toISOString(),
			expiresAt: row.expiresAt.toISOString(),
		}));
	}

	async findSessionByRefreshTokenHash(hash: string): Promise<AuthSession | null> {
		const [row] = await this.db
			.select()
			.from(authSessions)
			.where(
				or(
					eq(authSessions.refreshTokenHash, hash),
					eq(authSessions.previousRefreshTokenHash, hash),
				),
			)
			.limit(1);
		if (!row) {
			return null;
		}
		return {
			id: row.id,
			userId: row.userId,
			expiresAt: row.expiresAt,
			revokedAt: row.revokedAt,
			organizationId: row.organizationId,
			matched: row.refreshTokenHash === hash ? "current" : "previous",
			rotatedAt: row.refreshTokenRotatedAt,
		};
	}

	async rotateRefreshToken({
		sessionId,
		currentHash,
		nextHash,
	}: {
		sessionId: string;
		currentHash: string;
		nextHash: string;
	}): Promise<boolean> {
		const rows = await this.db
			.update(authSessions)
			.set({
				refreshTokenHash: nextHash,
				previousRefreshTokenHash: currentHash,
				refreshTokenRotatedAt: sql`now()`,
				updatedAt: sql`now()`,
			})
			.where(
				and(
					eq(authSessions.id, sessionId),
					eq(authSessions.refreshTokenHash, currentHash),
					isNull(authSessions.revokedAt),
				),
			)
			.returning({ id: authSessions.id });
		return rows.length > 0;
	}

	async revokeSession({
		sessionId,
		userId,
	}: {
		sessionId: string;
		userId: string;
	}): Promise<boolean> {
		const rows = await this.db
			.update(authSessions)
			.set({ revokedAt: sql`now()`, updatedAt: sql`now()` })
			.where(
				and(
					eq(authSessions.id, sessionId),
					eq(authSessions.userId, userId),
					isNull(authSessions.revokedAt),
					gt(authSessions.expiresAt, sql`now()`),
				),
			)
			.returning({ id: authSessions.id });
		return rows.length > 0;
	}

	async revokeOtherSessions({
		userId,
		keepSessionId,
	}: {
		userId: string;
		keepSessionId: string;
	}): Promise<number> {
		const rows = await this.db
			.update(authSessions)
			.set({ revokedAt: sql`now()`, updatedAt: sql`now()` })
			.where(
				and(
					eq(authSessions.userId, userId),
					ne(authSessions.id, keepSessionId),
					isNull(authSessions.revokedAt),
				),
			)
			.returning({ id: authSessions.id });
		return rows.length;
	}

	async revokeAllSessions(userId: string): Promise<void> {
		await this.db
			.update(authSessions)
			.set({ revokedAt: sql`now()`, updatedAt: sql`now()` })
			.where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
	}

	async replaceAuthToken(input: {
		userId: string;
		purpose: AuthTokenPurpose;
		tokenHash: string;
		expiresAt: Date;
	}): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.update(authTokens)
				.set({ usedAt: sql`now()` })
				.where(
					and(
						eq(authTokens.userId, input.userId),
						eq(authTokens.purpose, input.purpose),
						isNull(authTokens.usedAt),
					),
				);
			await tx.insert(authTokens).values(input);
		});
	}

	async consumeAuthToken({
		purpose,
		tokenHash,
	}: {
		purpose: AuthTokenPurpose;
		tokenHash: string;
	}): Promise<string | null> {
		const [row] = await this.db
			.update(authTokens)
			.set({ usedAt: sql`now()` })
			.where(
				and(
					eq(authTokens.tokenHash, tokenHash),
					eq(authTokens.purpose, purpose),
					isNull(authTokens.usedAt),
					gt(authTokens.expiresAt, sql`now()`),
				),
			)
			.returning({ userId: authTokens.userId });
		return row?.userId ?? null;
	}

	async markEmailVerified(userId: string): Promise<void> {
		await this.db
			.update(users)
			.set({
				emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
				updatedAt: sql`now()`,
			})
			.where(eq(users.id, userId));
	}

	async updatePasswordHash({
		userId,
		passwordHash,
	}: {
		userId: string;
		passwordHash: string;
	}): Promise<void> {
		await this.db
			.update(users)
			.set({ passwordHash, updatedAt: sql`now()` })
			.where(eq(users.id, userId));
	}

	async setSessionOrganization({
		sessionId,
		userId,
		organizationId,
	}: {
		sessionId: string;
		userId: string;
		organizationId: string | null;
	}): Promise<void> {
		await this.db
			.update(authSessions)
			.set({ organizationId, updatedAt: sql`now()` })
			.where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)));
	}
}
