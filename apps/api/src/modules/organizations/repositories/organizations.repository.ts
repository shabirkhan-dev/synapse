import { and, asc, count, desc, eq, gt, inArray, isNull } from "drizzle-orm";

import {
	type Database,
	type OrganizationInvitationRow,
	organizationInvitations,
	organizationMembers,
	organizations,
	ragDocumentMembers,
	ragDocuments,
	users,
} from "@synapse/database";
import type { OrganizationRole } from "@synapse/security";

import { toOrganization } from "../mappers/organizations.mapper";
import type {
	Invitation,
	InvitationByToken,
	Member,
	Membership,
	Organization,
	OrganizationStore,
} from "../types/organizations.types";

export class DrizzleOrganizationRepository implements OrganizationStore {
	constructor(private readonly db: Database) {}

	async create(name: string, ownerId: string): Promise<Organization> {
		return this.db.transaction(async (tx) => {
			const [row] = await tx.insert(organizations).values({ name, kind: "team" }).returning();
			if (!row) {
				throw new Error("Failed to insert organization");
			}
			await tx
				.insert(organizationMembers)
				.values({ organizationId: row.id, userId: ownerId, role: "owner" });
			return toOrganization(row);
		});
	}

	async find(id: string): Promise<Organization | null> {
		const [row] = await this.db
			.select()
			.from(organizations)
			.where(eq(organizations.id, id))
			.limit(1);
		return row ? toOrganization(row) : null;
	}

	async listForUser(userId: string): Promise<Membership[]> {
		const rows = await this.db
			.select({ organization: organizations, role: organizationMembers.role })
			.from(organizationMembers)
			.innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
			.where(eq(organizationMembers.userId, userId))
			.orderBy(asc(organizations.createdAt));
		return rows.map(({ organization, role }) =>
			Object.assign(toOrganization(organization), { role: role as OrganizationRole }),
		);
	}

	async role(organizationId: string, userId: string): Promise<OrganizationRole | null> {
		const [row] = await this.db
			.select({ role: organizationMembers.role })
			.from(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, organizationId),
					eq(organizationMembers.userId, userId),
				),
			)
			.limit(1);
		return row ? (row.role as OrganizationRole) : null;
	}

	async members(organizationId: string): Promise<Member[]> {
		const rows = await this.db
			.select({
				userId: organizationMembers.userId,
				email: users.email,
				role: organizationMembers.role,
				createdAt: organizationMembers.createdAt,
			})
			.from(organizationMembers)
			.innerJoin(users, eq(users.id, organizationMembers.userId))
			.where(eq(organizationMembers.organizationId, organizationId))
			.orderBy(asc(organizationMembers.createdAt));
		return rows.map((row) => ({
			userId: row.userId,
			email: row.email,
			role: row.role as OrganizationRole,
			createdAt: row.createdAt.toISOString(),
		}));
	}

	async addMemberIfAbsent(
		organizationId: string,
		userId: string,
		role: OrganizationRole,
	): Promise<void> {
		await this.db
			.insert(organizationMembers)
			.values({ organizationId, userId, role })
			.onConflictDoNothing();
	}

	async saveMember(organizationId: string, userId: string, role: OrganizationRole): Promise<void> {
		await this.db
			.insert(organizationMembers)
			.values({ organizationId, userId, role })
			.onConflictDoUpdate({
				target: [organizationMembers.organizationId, organizationMembers.userId],
				set: { role },
			});
	}

	async removeMember(organizationId: string, userId: string): Promise<boolean> {
		return this.db.transaction(async (tx) => {
			const rows = await tx
				.delete(organizationMembers)
				.where(
					and(
						eq(organizationMembers.organizationId, organizationId),
						eq(organizationMembers.userId, userId),
					),
				)
				.returning({ userId: organizationMembers.userId });
			// Shares on this organization's restricted documents end with the membership (ADR-0008),
			// so rejoining later does not bring them back.
			await tx
				.delete(ragDocumentMembers)
				.where(
					and(
						eq(ragDocumentMembers.userId, userId),
						inArray(
							ragDocumentMembers.documentId,
							tx
								.select({ id: ragDocuments.id })
								.from(ragDocuments)
								.where(eq(ragDocuments.ownerId, organizationId)),
						),
					),
				);
			return rows.length > 0;
		});
	}

	async countOwners(organizationId: string): Promise<number> {
		const [row] = await this.db
			.select({ owners: count() })
			.from(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, organizationId),
					eq(organizationMembers.role, "owner"),
				),
			);
		return Number(row?.owners ?? 0);
	}

	async saveInvitation(input: {
		organizationId: string;
		email: string;
		role: OrganizationRole;
		tokenHash: string;
		invitedBy: string;
		expiresAt: Date;
	}): Promise<Invitation> {
		return this.db.transaction(async (tx) => {
			// One pending invitation per address: a new one voids the old link.
			await tx
				.delete(organizationInvitations)
				.where(
					and(
						eq(organizationInvitations.organizationId, input.organizationId),
						eq(organizationInvitations.email, input.email),
						isNull(organizationInvitations.acceptedAt),
					),
				);
			const [row] = await tx.insert(organizationInvitations).values(input).returning();
			if (!row) throw new Error("Failed to insert invitation");
			return toInvitation(row);
		});
	}

	async listInvitations(organizationId: string, now: Date): Promise<Invitation[]> {
		const rows = await this.db
			.select()
			.from(organizationInvitations)
			.where(
				and(
					eq(organizationInvitations.organizationId, organizationId),
					isNull(organizationInvitations.acceptedAt),
					gt(organizationInvitations.expiresAt, now),
				),
			)
			.orderBy(desc(organizationInvitations.createdAt));
		return rows.map(toInvitation);
	}

	async revokeInvitation(organizationId: string, invitationId: string): Promise<boolean> {
		const rows = await this.db
			.delete(organizationInvitations)
			.where(
				and(
					eq(organizationInvitations.id, invitationId),
					eq(organizationInvitations.organizationId, organizationId),
					isNull(organizationInvitations.acceptedAt),
				),
			)
			.returning({ id: organizationInvitations.id });
		return rows.length > 0;
	}

	async findInvitation(tokenHash: string): Promise<InvitationByToken | null> {
		const [row] = await this.db
			.select()
			.from(organizationInvitations)
			.where(eq(organizationInvitations.tokenHash, tokenHash))
			.limit(1);
		return row
			? {
					...toInvitation(row),
					organizationId: row.organizationId,
					acceptedAt: row.acceptedAt?.toISOString() ?? null,
				}
			: null;
	}

	async acceptInvitation(invitationId: string, userId: string, now: Date): Promise<boolean> {
		return this.db.transaction(async (tx) => {
			const [accepted] = await tx
				.update(organizationInvitations)
				.set({ acceptedAt: now })
				.where(
					and(
						eq(organizationInvitations.id, invitationId),
						isNull(organizationInvitations.acceptedAt),
						gt(organizationInvitations.expiresAt, now),
					),
				)
				.returning();
			if (!accepted) return false;
			// Someone already in the team keeps their role (an invitation never demotes).
			await tx
				.insert(organizationMembers)
				.values({ organizationId: accepted.organizationId, userId, role: accepted.role })
				.onConflictDoNothing();
			return true;
		});
	}
}

function toInvitation(row: OrganizationInvitationRow): Invitation {
	return {
		id: row.id,
		email: row.email,
		role: row.role as OrganizationRole,
		expiresAt: row.expiresAt.toISOString(),
		createdAt: row.createdAt.toISOString(),
	};
}
