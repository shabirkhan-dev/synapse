/** Roles inside an organization, from most to least powerful. */
export const ORGANIZATION_ROLES = ["owner", "admin", "member"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** What a role may do. Owners can do everything admins can; admins everything members can. */
export const PERMISSIONS = {
	"documents.read": "member",
	"documents.write": "member",
	"actions.request": "member",
	"approvals.decide": "admin",
	"audit.read_all": "admin",
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

export function isOrganizationRole(value: string): value is OrganizationRole {
	return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}
