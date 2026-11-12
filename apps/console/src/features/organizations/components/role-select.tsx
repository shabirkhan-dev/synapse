"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@synapse/ui/components/select";

import type { OrganizationRole } from "@/lib/permissions";

import { ROLE_LABELS } from "../constants/organizations.constants";

export type RoleSelectProps = {
	/** Accessible name of the trigger, e.g. "Role of ada@example.com". */
	label: string;
	roles: ReadonlyArray<OrganizationRole>;
	disabled?: boolean;
} & (
	| { value: OrganizationRole; onChange: (role: OrganizationRole) => void; name?: never }
	| { defaultValue: OrganizationRole; name: string; value?: never; onChange?: never }
);

/** A role picker: controlled (`value` + `onChange`) or a form field (`name` + `defaultValue`). */
export function RoleSelect({ label, roles, disabled, ...mode }: RoleSelectProps) {
	const items = roles.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
	return (
		<Select
			items={items}
			disabled={disabled ?? false}
			{...(mode.name === undefined
				? {
						value: mode.value,
						onValueChange: (role: OrganizationRole | null) => {
							if (role && role !== mode.value) mode.onChange(role);
						},
					}
				: { name: mode.name, defaultValue: mode.defaultValue })}
		>
			<SelectTrigger size="sm" aria-label={label} className="min-w-24">
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
