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
			<SelectTrigger
				aria-label="Organization"
				className="h-9 w-full gap-2 border-transparent bg-transparent px-2 text-sm hover:bg-sidebar-accent dark:bg-transparent"
			>
				<span
					aria-hidden="true"
					className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground uppercase"
				>
					{active?.name.slice(0, 1) ?? "?"}
				</span>
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
