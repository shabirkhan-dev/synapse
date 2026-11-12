/** Roles inside an organization, from most to least powerful (as in `@synapse/security`). */
export const ORGANIZATION_ROLES = ["owner", "admin", "member"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/**
 * The subset of the API's role rules the console needs to hide controls a role cannot use. The
 * API stays the authority: it checks every request and answers 403 regardless.
 */
const PERMISSIONS = {
	"approvals.decide": "admin",
	"members.manage": "admin",
	"members.manage_admins": "owner",
} as const satisfies Record<string, OrganizationRole>;

export type Permission = keyof typeof PERMISSIONS;

const rank = (role: OrganizationRole) =>
	ORGANIZATION_ROLES.length - ORGANIZATION_ROLES.indexOf(role);

/** Whether `role` grants `permission`. */
export function can(role: OrganizationRole, permission: Permission): boolean {
	return rank(role) >= rank(PERMISSIONS[permission]);
}
