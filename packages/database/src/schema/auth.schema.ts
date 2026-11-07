import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** Stored trimmed and lowercased, so the unique index is case-insensitive. */
		email: text("email").notNull(),
		/** Argon2id hash string (`@synapse/security`); never the password. */
		passwordHash: text("password_hash").notNull(),
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

export type UserRow = typeof users.$inferSelect;
export type AuthSessionRow = typeof authSessions.$inferSelect;
