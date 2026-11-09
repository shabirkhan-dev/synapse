import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import { can, type OrganizationRole, type Permission } from "@synapse/security";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser, RequestContext } from "@/shared/types/app-types";

import {
	ORGANIZATION_ERROR_CODES,
	ORGANIZATION_MESSAGES,
	PERSONAL_ORGANIZATION_NAME,
} from "../constants/organizations.constants";
import type {
	Member,
	Membership,
	Organization,
	OrganizationStore,
} from "../types/organizations.types";

export type OrganizationsServiceOptions = {
	store: OrganizationStore;
	/** Account lookup for invitations (the auth module owns users). */
	findUserIdByEmail: (email: string) => Promise<string | null>;
	audit: AuditLog;
};

/**
 * Organizations (tenants), members and roles. A user's personal organization has the user's id and
 * exactly one member, its owner. Roles are always read from the database.
 */
export class OrganizationsService {
	constructor(private readonly options: OrganizationsServiceOptions) {}

	/** The user's role in the organization, or `null` if not a member. */
	async roleOf(organizationId: string, userId: string): Promise<OrganizationRole | null> {
		// The personal organization (id = user id) is always the user's, even before its row exists.
		if (organizationId === userId) {
			return "owner";
		}
		return this.options.store.role(organizationId, userId);
	}

	/** Throws 403 unless the caller's role in their active organization grants `permission`. */
	assertCan(user: AuthUser, permission: Permission): void {
		if (!can(user.role, permission)) {
			throw forbidden();
		}
	}

	async listMine(userId: string): Promise<Membership[]> {
		const memberships = await this.options.store.listForUser(userId);
		if (memberships.some((membership) => membership.id === userId)) {
			return memberships;
		}
		const personal: Membership = {
			id: userId,
			name: PERSONAL_ORGANIZATION_NAME,
			kind: "personal",
			role: "owner",
			createdAt: new Date(0).toISOString(),
		};
		return [personal, ...memberships];
	}

	async create(user: AuthUser, name: string, context: RequestContext): Promise<Organization> {
		const organization = await this.options.store.create(name, user.sub);
		await this.record(
			organization.id,
			user.sub,
			AUDIT_ACTIONS.ORGANIZATION_CREATED,
			organization.id,
			context,
			{
				name,
			},
		);
		return organization;
	}

	async members(user: AuthUser, organizationId: string): Promise<Member[]> {
		await this.requireRole(user.sub, organizationId, "documents.read");
		return this.options.store.members(organizationId);
	}

	/** Add an existing account (by email) or change a member's role. */
	async saveMember(
		user: AuthUser,
		organizationId: string,
		{ email, role }: { email: string; role: OrganizationRole },
		context: RequestContext,
	): Promise<Member[]> {
		const callerRole = await this.requireRole(user.sub, organizationId, "members.manage");
		await this.assertTeam(organizationId);
		if (role !== "member" && !can(callerRole, "members.manage_admins")) {
			throw forbidden();
		}
		const userId = await this.options.findUserIdByEmail(email.trim().toLowerCase());
		if (!userId) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: ORGANIZATION_ERROR_CODES.USER_NOT_FOUND,
				message: ORGANIZATION_MESSAGES.USER_NOT_FOUND,
			});
		}
		const current = await this.options.store.role(organizationId, userId);
		if (current === "owner" && role !== "owner") {
			await this.assertNotLastOwner(organizationId, callerRole);
		}
		await this.options.store.saveMember(organizationId, userId, role);
		await this.record(
			organizationId,
			user.sub,
			AUDIT_ACTIONS.ORGANIZATION_MEMBER_SAVED,
			userId,
			context,
			{
				role,
			},
		);
		return this.options.store.members(organizationId);
	}

	async removeMember(
		user: AuthUser,
		organizationId: string,
		userId: string,
		context: RequestContext,
	): Promise<void> {
		const callerRole = await this.requireRole(user.sub, organizationId, "members.manage");
		await this.assertTeam(organizationId);
		const role = await this.options.store.role(organizationId, userId);
		if (!role) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: ORGANIZATION_ERROR_CODES.MEMBER_NOT_FOUND,
				message: ORGANIZATION_MESSAGES.MEMBER_NOT_FOUND,
			});
		}
		if (role === "owner") {
			await this.assertNotLastOwner(organizationId, callerRole);
		}
		await this.options.store.removeMember(organizationId, userId);
		await this.record(
			organizationId,
			user.sub,
			AUDIT_ACTIONS.ORGANIZATION_MEMBER_REMOVED,
			userId,
			context,
			{
				role,
			},
		);
	}

	/** The caller's role in `organizationId` (any organization, not only the active one). */
	private async requireRole(
		userId: string,
		organizationId: string,
		permission: Permission,
	): Promise<OrganizationRole> {
		const role = await this.roleOf(organizationId, userId);
		if (!role) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: ORGANIZATION_ERROR_CODES.NOT_FOUND,
				message: ORGANIZATION_MESSAGES.NOT_FOUND,
			});
		}
		if (!can(role, permission)) {
			throw forbidden();
		}
		return role;
	}

	private async assertTeam(organizationId: string): Promise<void> {
		const organization = await this.options.store.find(organizationId);
		if (!organization || organization.kind === "personal") {
			throw new AppError({
				statusCode: HTTP_STATUS.BAD_REQUEST,
				code: ORGANIZATION_ERROR_CODES.PERSONAL,
				message: ORGANIZATION_MESSAGES.PERSONAL,
			});
		}
	}

	/** Only owners may demote or remove an owner, and never the last one. */
	private async assertNotLastOwner(
		organizationId: string,
		callerRole: OrganizationRole,
	): Promise<void> {
		if (!can(callerRole, "members.manage_admins")) {
			throw forbidden();
		}
		if ((await this.options.store.countOwners(organizationId)) <= 1) {
			throw new AppError({
				statusCode: HTTP_STATUS.CONFLICT,
				code: ORGANIZATION_ERROR_CODES.LAST_OWNER,
				message: ORGANIZATION_MESSAGES.LAST_OWNER,
			});
		}
	}

	private async record(
		organizationId: string,
		actorId: string,
		action: string,
		subjectId: string,
		context: RequestContext,
		data: Record<string, unknown>,
	): Promise<void> {
		await this.options.audit.record({
			ownerId: organizationId,
			actorId,
			action,
			subjectType: action.startsWith("organization.member") ? "user" : "organization",
			subjectId,
			requestId: context.requestId,
			data,
			provenance: null,
		});
	}
}

function forbidden(): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.FORBIDDEN,
		code: ORGANIZATION_ERROR_CODES.FORBIDDEN,
		message: ORGANIZATION_MESSAGES.FORBIDDEN,
	});
}
