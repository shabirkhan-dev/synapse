"use client";

import { useCurrentUserQuery } from "@/features/auth";

import { OrganizationSwitcher } from "../components/organization-switcher";
import { useSwitchOrganizationMutation } from "../hooks/mutations/use-switch-organization-mutation";
import { useOrganizationsQuery } from "../hooks/queries/use-organizations-query";

/** The header's organization picker; hidden until both the user and their organizations load. */
export function OrganizationSwitcherContainer() {
	const me = useCurrentUserQuery();
	const organizations = useOrganizationsQuery();
	const switchOrganization = useSwitchOrganizationMutation();
	if (!me.data || !organizations.data) return null;
	return (
		<OrganizationSwitcher
			memberships={organizations.data}
			activeId={switchOrganization.variables ?? me.data.organization.id}
			switching={switchOrganization.isPending}
			onSwitch={(id) => switchOrganization.mutate(id)}
		/>
	);
}
