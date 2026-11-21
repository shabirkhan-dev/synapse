import {
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth.schema";

/**
 * Tenants. A user's personal organization has the user's id, so rows keyed by `owner_id` = user id
 * (everything written before organizations existed) already belong to it.
 */
export const organizations = pgTable("organizations", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	/** `personal` (one per user, id = user id) or `team`. */
	kind: text("kind").notNull().default("team"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable(
	"organization_members",
	{
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** `owner`, `admin` or `member` (`@synapse/security` roles). */
		role: text("role").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ name: "organization_members_pk", columns: [table.organizationId, table.userId] }),
		index("organization_members_user_idx").on(table.userId),
	],
);

/**
 * An emailed invitation to join a team, for someone who may not have an account yet. The link holds
 * a single-use token; only its SHA-256 is stored. Accepting needs an account with this email.
 */
export const organizationInvitations = pgTable(
	"organization_invitations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		/** Trimmed and lowercased. */
		email: text("email").notNull(),
		/** Role given on joining (`@synapse/security` roles). */
		role: text("role").notNull(),
		tokenHash: text("token_hash").notNull(),
		invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("organization_invitations_token_hash_unique").on(table.tokenHash),
		index("organization_invitations_organization_email_idx").on(table.organizationId, table.email),
	],
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationInvitationRow = typeof organizationInvitations.$inferSelect;
export type OrganizationMemberRow = typeof organizationMembers.$inferSelect;
