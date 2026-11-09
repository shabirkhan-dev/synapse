import type { OrganizationRole } from "@synapse/security";

export type OrganizationKind = "personal" | "team";

export type Organization = { id: string; name: string; kind: OrganizationKind; createdAt: string };

export type Membership = Organization & { role: OrganizationRole };

export type Member = { userId: string; email: string; role: OrganizationRole; createdAt: string };

export interface OrganizationStore {
	/** Create a team organization with `ownerId` as its owner (one transaction). */
	create(name: string, ownerId: string): Promise<Organization>;
	find(id: string): Promise<Organization | null>;
	listForUser(userId: string): Promise<Membership[]>;
	role(organizationId: string, userId: string): Promise<OrganizationRole | null>;
	members(organizationId: string): Promise<Member[]>;
	/** Insert or change a member's role. */
	saveMember(organizationId: string, userId: string, role: OrganizationRole): Promise<void>;
	removeMember(organizationId: string, userId: string): Promise<boolean>;
	countOwners(organizationId: string): Promise<number>;
}
