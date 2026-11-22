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
	const active = memberships.find((membership) => membership.id === activeId);
	return (
		<Select
			items={items}
			value={activeId}
			disabled={switching}
			onValueChange={(id: string | null) => {
				if (id && id !== activeId) onSwitch(id);
			}}
		>
			{/* The workspace name beside the product mark, with ⇕ to switch (as in the references). */}
			<SelectTrigger
				aria-label="Organization"
				title={active?.name}
				className="h-9 w-fit max-w-full gap-1.5 border-transparent bg-transparent px-1.5 text-[0.9375rem] shadow-none hover:bg-sidebar-accent dark:bg-transparent dark:hover:bg-sidebar-accent"
			>
				<SelectValue className="truncate font-medium" />
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
