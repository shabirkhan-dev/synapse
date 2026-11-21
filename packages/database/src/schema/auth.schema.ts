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
		/** Two-step sign-in (syn-084): the TOTP secret, sealed with `AUTH_ENCRYPTION_KEY`. */
		mfaSecret: text("mfa_secret"),
		/** A secret being set up, until its first code is confirmed. */
		mfaPendingSecret: text("mfa_pending_secret"),
		/** Set while two-step sign-in is on. */
		mfaEnabledAt: timestamp("mfa_enabled_at", { withTimezone: true }),
		/** The last TOTP counter accepted, so a code works once. */
		mfaLastCounter: integer("mfa_last_counter"),
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

/**
 * Personal API keys (syn-083): act as their user in one organization, with the user's current role
 * there. Only the SHA-256 of the key is stored; `prefix` (the first characters) helps tell keys apart.
 */
export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** The organization the key acts in (the personal one = the user id). */
		organizationId: text("organization_id").notNull(),
		name: text("name").notNull(),
		prefix: text("prefix").notNull(),
		keyHash: text("key_hash").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("api_keys_key_hash_unique").on(table.keyHash),
		index("api_keys_user_id_idx").on(table.userId),
	],
);

export type ApiKeyRow = typeof apiKeys.$inferSelect;

/** One-time recovery codes for two-step sign-in (SHA-256 of the normalized code). */
export const mfaRecoveryCodes = pgTable(
	"mfa_recovery_codes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		codeHash: text("code_hash").notNull(),
		usedAt: timestamp("used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex("mfa_recovery_codes_user_hash_unique").on(table.userId, table.codeHash)],
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
