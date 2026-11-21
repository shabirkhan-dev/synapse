import type { OrganizationRole } from "@synapse/security";

export type OrganizationKind = "personal" | "team";

export type Organization = { id: string; name: string; kind: OrganizationKind; createdAt: string };

export type Membership = Organization & { role: OrganizationRole };

export type Member = { userId: string; email: string; role: OrganizationRole; createdAt: string };

/** A pending emailed invitation to join a team (the token is never stored or returned). */
export type Invitation = {
	id: string;
	email: string;
	role: OrganizationRole;
	expiresAt: string;
	createdAt: string;
};

/** An invitation found by its link's token, with what accepting it needs to check. */
export type InvitationByToken = Invitation & {
	organizationId: string;
	acceptedAt: string | null;
};

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
	/** Store a new invitation, replacing any pending one for the same email in this team. */
	saveInvitation(input: {
		organizationId: string;
		email: string;
		role: OrganizationRole;
		tokenHash: string;
		invitedBy: string;
		expiresAt: Date;
	}): Promise<Invitation>;
	/** Pending (not accepted, not expired) invitations, newest first. */
	listInvitations(organizationId: string, now: Date): Promise<Invitation[]>;
	revokeInvitation(organizationId: string, invitationId: string): Promise<boolean>;
	findInvitation(tokenHash: string): Promise<InvitationByToken | null>;
	/**
	 * Mark it accepted (once, before it expires) and add the user with its role, in one
	 * transaction; an existing member keeps their role. False when it was already used or expired.
	 */
	acceptInvitation(invitationId: string, userId: string, now: Date): Promise<boolean>;
}
