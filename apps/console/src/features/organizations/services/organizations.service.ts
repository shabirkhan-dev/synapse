import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { setAccessToken } from "@/lib/api/session";

import {
	memberListSchema,
	membershipListSchema,
	organizationSchema,
	removedMemberSchema,
	switchedOrganizationSchema,
} from "../schemas/organization.schema";
import type {
	Member,
	Membership,
	Organization,
	RemoveMemberInput,
	SaveMemberInput,
	SwitchedOrganization,
} from "../types/organization.types";

/** Act in another organization: the API answers with an access token for it, kept in memory. */
async function switchTo(organizationId: string): Promise<SwitchedOrganization> {
	const switched = await api(endpoints.auth.switchOrganization, {
		method: "POST",
		body: { organizationId },
		schema: switchedOrganizationSchema,
	});
	setAccessToken(switched.accessToken);
	return switched;
}

export const organizationsService = {
	/** Organizations the user belongs to (personal first), with their role in each. */
	list: (): Promise<Membership[]> =>
		api(endpoints.organizations.list, { schema: membershipListSchema }),

	switchTo,

	/** Creates a team (the caller becomes its owner) and switches into it. */
	async createTeam(name: string): Promise<Organization> {
		const organization = await api(endpoints.organizations.create, {
			method: "POST",
			body: { name },
			schema: organizationSchema,
		});
		await switchTo(organization.id);
		return organization;
	},

	members: (organizationId: string): Promise<Member[]> =>
		api(endpoints.organizations.members(organizationId), { schema: memberListSchema }),

	/** Adds an existing account by email, or changes the role of one already in the team. */
	saveMember: ({ organizationId, email, role }: SaveMemberInput): Promise<Member[]> =>
		api(endpoints.organizations.members(organizationId), {
			method: "POST",
			body: { email, role },
			schema: memberListSchema,
		}),

	removeMember: ({ organizationId, userId }: RemoveMemberInput): Promise<{ userId: string }> =>
		api(endpoints.organizations.member(organizationId, userId), {
			method: "DELETE",
			schema: removedMemberSchema,
		}),
};
