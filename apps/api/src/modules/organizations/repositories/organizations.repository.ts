import { and, asc, count, eq } from "drizzle-orm";

import { type Database, organizationMembers, organizations, users } from "@synapse/database";
import type { OrganizationRole } from "@synapse/security";

import { toOrganization } from "../mappers/organizations.mapper";
import type {
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
		const rows = await this.db
			.delete(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, organizationId),
					eq(organizationMembers.userId, userId),
				),
			)
			.returning({ userId: organizationMembers.userId });
		return rows.length > 0;
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
}
