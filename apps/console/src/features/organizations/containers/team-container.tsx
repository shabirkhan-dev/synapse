"use client";

import { UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

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

import { useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { useCurrentUserQuery } from "@/features/auth";
import { ApiError } from "@/lib/api/api-error";
import { can, ORGANIZATION_ROLES, type OrganizationRole } from "@/lib/permissions";

import { AddMemberForm } from "../components/add-member-form";
import { CreateTeamForm } from "../components/create-team-form";
import { InvitationsList } from "../components/invitations-list";
import { MembersTable } from "../components/members-table";
import { ROLE_LABELS } from "../constants/organizations.constants";
import { useCreateTeamMutation } from "../hooks/mutations/use-create-team-mutation";
import { useInviteMutation } from "../hooks/mutations/use-invite-mutation";
import { useRevokeInvitationMutation } from "../hooks/mutations/use-revoke-invitation-mutation";
import { useRemoveMemberMutation } from "../hooks/mutations/use-remove-member-mutation";
import { useSaveMemberMutation } from "../hooks/mutations/use-save-member-mutation";
import { useInvitationsQuery } from "../hooks/queries/use-invitations-query";
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
	const invite = useInviteMutation();
	const revoke = useRevokeInvitationMutation();
	const [invited, setInvited] = useState<string | null>(null);
	const manages =
		active?.kind === "team" &&
		me.data !== undefined &&
		can(me.data.organization.role, "members.manage");
	const invitations = useInvitationsQuery(manages && active ? active.id : null);

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
	const failure = save.error ?? remove.error ?? invite.error ?? revoke.error;
	const busyUserId = save.isPending
		? (members.data?.find((member) => member.email === save.variables?.email)?.userId ?? null)
		: remove.isPending
			? (remove.variables?.userId ?? null)
			: null;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={active.name}
				badge={<Badge variant="outline">{ROLE_LABELS[role]}</Badge>}
			/>

			{active.kind === "personal" ? (
				<p className="text-sm text-muted-foreground">
					This is your personal workspace: only you can see its documents. Create a team to share
					documents, approvals and activity with other people.
				</p>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>
							<HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.75} aria-hidden="true" />
							Members
							{members.data ? <Badge variant="count">{members.data.length}</Badge> : null}
						</CardTitle>
						<CardDescription>
							{roles.length > 0
								? "Add people by email; anyone without an account yet gets an invitation. Members ask; admins and owners decide."
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
								pending={save.isPending || invite.isPending}
								onAdd={async (input) => {
									remove.reset();
									invite.reset();
									setInvited(null);
									const change = { organizationId: active.id, ...input };
									try {
										await save.mutateAsync(change);
									} catch (error) {
										// No account yet: email them an invitation instead.
										if (
											!(error instanceof ApiError && error.code === "ORGANIZATION_USER_NOT_FOUND")
										) {
											throw error;
										}
										save.reset();
										await invite.mutateAsync(change);
										setInvited(input.email);
									}
								}}
							/>
						) : null}
						{invited ? (
							<p role="status" className="text-sm text-muted-foreground">
								Invited {invited}. They join when they open the emailed link (valid for 7 days).
							</p>
						) : null}
						{manages && invitations.data ? (
							<InvitationsList
								invitations={invitations.data}
								busyId={revoke.isPending ? (revoke.variables?.invitationId ?? null) : null}
								onRevoke={(invitation) =>
									revoke.mutate({ organizationId: active.id, invitationId: invitation.id })
								}
							/>
						) : null}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>
						<HugeiconsIcon icon={UserAdd01Icon} strokeWidth={1.75} aria-hidden="true" />
						New team
					</CardTitle>
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
