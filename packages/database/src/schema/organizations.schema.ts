import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationMemberRow = typeof organizationMembers.$inferSelect;
