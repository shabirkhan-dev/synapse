import { and, eq, isNull, or, sql } from "drizzle-orm";

import { authSessions, type Database, users } from "@synapse/database";

import { toUser, toUserCredentials } from "../mappers/auth.mapper";
import type { AuthRepository, AuthSession, User, UserCredentials } from "../types/auth.types";

export class DrizzleAuthRepository implements AuthRepository {
	constructor(private readonly db: Database) {}

	async createUser({
		email,
		passwordHash,
	}: {
		email: string;
		passwordHash: string;
	}): Promise<User | null> {
		const [row] = await this.db
			.insert(users)
			.values({ email, passwordHash })
			.onConflictDoNothing({ target: users.email })
			.returning();
		return row ? toUser(row) : null;
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
			matched: row.refreshTokenHash === hash ? "current" : "previous",
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

	async revokeSession({ sessionId, userId }: { sessionId: string; userId: string }): Promise<void> {
		await this.db
			.update(authSessions)
			.set({ revokedAt: sql`now()`, updatedAt: sql`now()` })
			.where(
				and(
					eq(authSessions.id, sessionId),
					eq(authSessions.userId, userId),
					isNull(authSessions.revokedAt),
				),
			);
	}
}
