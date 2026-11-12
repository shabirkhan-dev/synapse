"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Badge } from "@synapse/ui/components/badge";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";

import { useCurrentUserQuery } from "@/features/auth";
import { can, ORGANIZATION_ROLES, type OrganizationRole } from "@/lib/permissions";

import { AddMemberForm } from "../components/add-member-form";
import { CreateTeamForm } from "../components/create-team-form";
import { MembersTable } from "../components/members-table";
import { ROLE_LABELS } from "../constants/organizations.constants";
import { useCreateTeamMutation } from "../hooks/mutations/use-create-team-mutation";
import { useRemoveMemberMutation } from "../hooks/mutations/use-remove-member-mutation";
import { useSaveMemberMutation } from "../hooks/mutations/use-save-member-mutation";
import { useMembersQuery } from "../hooks/queries/use-members-query";
import { useOrganizationsQuery } from "../hooks/queries/use-organizations-query";

/** Roles a caller may give: owners any, admins only "member", members none. */
function assignableRoles(role: OrganizationRole): ReadonlyArray<OrganizationRole> {
	if (!can(role, "members.manage")) return [];
	return can(role, "members.manage_admins") ? ORGANIZATION_ROLES : ["member"];
}

/** The active organization: its members (managed by admins and owners) and creating a team. */
export function TeamContainer() {
	const me = useCurrentUserQuery();
	const organizations = useOrganizationsQuery();
	const active = organizations.data?.find((org) => org.id === me.data?.organization.id) ?? null;
	const members = useMembersQuery(active?.kind === "team" ? active.id : null);
	const save = useSaveMemberMutation();
	const remove = useRemoveMemberMutation();
	const create = useCreateTeamMutation();

	if (me.isError || organizations.isError) {
		return (
			<Alert variant="destructive">
				<AlertTitle>Your organizations could not be loaded</AlertTitle>
				<AlertDescription className="flex items-center gap-3">
					{(me.error ?? organizations.error)?.message}
					<Button
						size="sm"
						variant="outline"
						onClick={() => Promise.all([me.refetch(), organizations.refetch()])}
					>
						Try again
					</Button>
				</AlertDescription>
			</Alert>
		);
	}
	if (!me.data || !active) {
		return (
			<p role="status" className="text-xs text-muted-foreground">
				Loading your organization…
			</p>
		);
	}

	const role = me.data.organization.role;
	const roles = assignableRoles(role);
	const failure = save.error ?? remove.error;
	const busyUserId = save.isPending
		? (members.data?.find((member) => member.email === save.variables?.email)?.userId ?? null)
		: remove.isPending
			? (remove.variables?.userId ?? null)
			: null;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-2">
				<h1 className="text-lg font-semibold">{active.name}</h1>
				<Badge variant="outline">{ROLE_LABELS[role]}</Badge>
			</div>

			{active.kind === "personal" ? (
				<p className="text-sm text-muted-foreground">
					This is your personal workspace: only you can see its documents. Create a team to share
					documents, approvals and activity with other people.
				</p>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Members</CardTitle>
						<CardDescription>
							{roles.length > 0
								? "Add people who already have a Synapse account. Members ask; admins and owners decide."
								: "Only admins and owners add people or change roles."}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{failure ? (
							<Alert variant="destructive">
								<AlertTitle>The change did not go through</AlertTitle>
								<AlertDescription>{failure.message}</AlertDescription>
							</Alert>
						) : null}
						{members.isPending ? (
							<p role="status" className="text-xs text-muted-foreground">
								Loading members…
							</p>
						) : members.isError ? (
							<Alert variant="destructive">
								<AlertTitle>Members could not be loaded</AlertTitle>
								<AlertDescription>{members.error.message}</AlertDescription>
							</Alert>
						) : (
							<MembersTable
								members={members.data}
								currentUserId={me.data.id}
								assignableRoles={roles}
								busyUserId={busyUserId}
								onRoleChange={(member, newRole) => {
									remove.reset();
									save.mutate({ organizationId: active.id, email: member.email, role: newRole });
								}}
								onRemove={(member) => {
									save.reset();
									remove.mutate({ organizationId: active.id, userId: member.userId });
								}}
							/>
						)}
						{roles.length > 0 ? (
							<AddMemberForm
								roles={roles}
								pending={save.isPending}
								onAdd={(input) => {
									remove.reset();
									return save.mutateAsync({ organizationId: active.id, ...input });
								}}
							/>
						) : null}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>New team</CardTitle>
					<CardDescription>You become its owner, and the console switches to it.</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{create.error ? (
						<Alert variant="destructive">
							<AlertTitle>The team was not created</AlertTitle>
							<AlertDescription>{create.error.message}</AlertDescription>
						</Alert>
					) : null}
					<CreateTeamForm pending={create.isPending} onCreate={create.mutateAsync} />
				</CardContent>
			</Card>
		</div>
	);
}
