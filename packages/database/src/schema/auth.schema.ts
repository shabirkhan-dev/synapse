import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** Stored trimmed and lowercased, so the unique index is case-insensitive. */
		email: text("email").notNull(),
		/** Argon2id hash string (`@synapse/security`); never the password. */
		passwordHash: text("password_hash").notNull(),
		/** Set when the user opens a verification link (or resets their password by email). */
		emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/** One row per sign-in. The access token's `sid` is this id; refresh tokens rotate on use. */
export const authSessions = pgTable(
	"auth_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** SHA-256 of the current refresh token; the token itself is never stored. */
		refreshTokenHash: text("refresh_token_hash").notNull(),
		/** Hash of the token this one replaced: presenting it again means the token was stolen. */
		previousRefreshTokenHash: text("previous_refresh_token_hash"),
		/**
		 * When the current token replaced the previous one. The previous token is still accepted for
		 * a few seconds after this (two tabs refreshing at once); later it means it was stolen.
		 */
		refreshTokenRotatedAt: timestamp("refresh_token_rotated_at", { withTimezone: true }),
		/** The browser or client that signed in (`User-Agent`, cut to 512 chars), to tell sessions apart. */
		userAgent: text("user_agent"),
		/** Active organization for this session's access tokens; `null` = the personal one. */
		organizationId: uuid("organization_id"),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("auth_sessions_refresh_token_hash_unique").on(table.refreshTokenHash),
		index("auth_sessions_previous_refresh_token_hash_idx").on(table.previousRefreshTokenHash),
		index("auth_sessions_user_id_idx").on(table.userId),
	],
);

/** Single-use links sent by email. Only the token's SHA-256 is stored. */
export const authTokens = pgTable(
	"auth_tokens",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** `email_verification` or `password_reset`. */
		purpose: text("purpose").notNull(),
		tokenHash: text("token_hash").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		usedAt: timestamp("used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("auth_tokens_token_hash_unique").on(table.tokenHash),
		index("auth_tokens_user_purpose_idx").on(table.userId, table.purpose),
	],
);

/** Fixed-window attempt counters, shared by every API instance. `key` is a SHA-256, never raw PII. */
export const authRateLimits = pgTable("auth_rate_limits", {
	key: text("key").primaryKey(),
	windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
	attempts: integer("attempts").notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type AuthTokenRow = typeof authTokens.$inferSelect;
