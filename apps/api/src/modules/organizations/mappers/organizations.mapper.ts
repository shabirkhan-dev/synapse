import type { OrganizationRow } from "@synapse/database";

import type { Organization, OrganizationKind } from "../types/organizations.types";

export function toOrganization(row: OrganizationRow): Organization {
	return {
		id: row.id,
		name: row.name,
		kind: row.kind as OrganizationKind,
		createdAt: row.createdAt.toISOString(),
	};
}
