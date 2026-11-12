"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@synapse/ui/components/select";

import type { Membership } from "../types/organization.types";

export type OrganizationSwitcherProps = {
	memberships: Membership[];
	activeId: string;
	switching: boolean;
	onSwitch: (organizationId: string) => void;
};

/** Which organization the console acts in: its documents, approvals and activity. */
export function OrganizationSwitcher({
	memberships,
	activeId,
	switching,
	onSwitch,
}: OrganizationSwitcherProps) {
	const items = memberships.map((membership) => ({ value: membership.id, label: membership.name }));
	return (
		<Select
			items={items}
			value={activeId}
			disabled={switching}
			onValueChange={(id: string | null) => {
				if (id && id !== activeId) onSwitch(id);
			}}
		>
			<SelectTrigger size="sm" aria-label="Organization" className="max-w-44">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
