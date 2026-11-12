"use client";

import { Button } from "@synapse/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import type { OrganizationRole } from "@/lib/permissions";

import { ROLE_LABELS } from "../constants/organizations.constants";
import type { Member } from "../types/organization.types";
import { RoleSelect } from "./role-select";

export type MembersTableProps = {
	members: Member[];
	currentUserId: string | null;
	/** Roles the caller may give; empty when they cannot manage members. */
	assignableRoles: ReadonlyArray<OrganizationRole>;
	/** The member being changed right now (their controls are disabled). */
	busyUserId: string | null;
	onRoleChange: (member: Member, role: OrganizationRole) => void;
	onRemove: (member: Member) => void;
};

/**
 * Members and roles. A row can be changed when the caller could give its current role (admins
 * manage members, owners everyone), never the caller's own row.
 */
export function MembersTable({
	members,
	currentUserId,
	assignableRoles,
	busyUserId,
	onRoleChange,
	onRemove,
}: MembersTableProps) {
	const manageable = (member: Member) =>
		member.userId !== currentUserId && assignableRoles.includes(member.role);
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Email</TableHead>
					<TableHead>Role</TableHead>
					<TableHead className="text-right">
						<span className="sr-only">Actions</span>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{members.map((member) => {
					const busy = busyUserId === member.userId;
					return (
						<TableRow key={member.userId}>
							<TableCell className="font-medium">
								{member.email}
								{member.userId === currentUserId ? (
									<span className="text-muted-foreground"> (you)</span>
								) : null}
							</TableCell>
							<TableCell>
								{manageable(member) ? (
									<RoleSelect
										label={`Role of ${member.email}`}
										roles={assignableRoles}
										value={member.role}
										disabled={busy}
										onChange={(role) => onRoleChange(member, role)}
									/>
								) : (
									ROLE_LABELS[member.role]
								)}
							</TableCell>
							<TableCell className="text-right">
								{manageable(member) ? (
									<Button
										variant="ghost"
										size="sm"
										disabled={busy}
										aria-label={`Remove ${member.email}`}
										onClick={() => onRemove(member)}
									>
										Remove
									</Button>
								) : null}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
