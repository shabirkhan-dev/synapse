import { sql } from "drizzle-orm";
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
import { organizations } from "./organizations.schema";

/**
 * A team's OpenID Connect provider for single sign-on (syn-094, ADR-0009). One per organization;
 * the client secret is sealed with `AUTH_ENCRYPTION_KEY`.
 */
export const ssoConnections = pgTable(
	"sso_connections",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		issuer: text("issuer").notNull(),
		clientId: text("client_id").notNull(),
		clientSecret: text("client_secret").notNull(),
		/** Role given to people who join the team through it (`member` or `admin`). */
		defaultRole: text("default_role").notNull().default("member"),
		/** Value of the DNS TXT record that proves the team controls a domain. */
		verificationToken: text("verification_token").notNull(),
		createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex("sso_connections_organization_unique").on(table.organizationId)],
);

/**
 * Email domains a connection signs in. A domain routes sign-ins only once verified, and only one
 * connection can hold it verified.
 */
export const ssoDomains = pgTable(
	"sso_domains",
	{
		connectionId: uuid("connection_id")
			.notNull()
			.references(() => ssoConnections.id, { onDelete: "cascade" }),
		/** Lowercased, no trailing dot. */
		domain: text("domain").notNull(),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ name: "sso_domains_pk", columns: [table.connectionId, table.domain] }),
		uniqueIndex("sso_domains_verified_unique")
			.on(table.domain)
			.where(sql`${table.verifiedAt} is not null`),
	],
);

/** One sign-in in flight: the state (SHA-256), its PKCE verifier and nonce. Used once. */
export const ssoLoginStates = pgTable(
	"sso_login_states",
	{
		stateHash: text("state_hash").primaryKey(),
		connectionId: uuid("connection_id")
			.notNull()
			.references(() => ssoConnections.id, { onDelete: "cascade" }),
		codeVerifier: text("code_verifier").notNull(),
		nonce: text("nonce").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("sso_login_states_expires_at_idx").on(table.expiresAt)],
);

export type SsoConnectionRow = typeof ssoConnections.$inferSelect;
export type SsoDomainRow = typeof ssoDomains.$inferSelect;
