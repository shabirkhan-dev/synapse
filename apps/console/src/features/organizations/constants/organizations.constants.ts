import type { OrganizationRole } from "@/lib/permissions";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
};
