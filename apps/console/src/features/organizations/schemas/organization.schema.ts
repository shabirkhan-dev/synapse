import { z } from "zod";

import { ORGANIZATION_ROLES } from "@/lib/permissions";

const role = z.enum(ORGANIZATION_ROLES);

export const organizationSchema = z.object({
	id: z.string(),
	name: z.string(),
	kind: z.enum(["personal", "team"]),
	createdAt: z.string(),
});

/** An organization the signed-in user belongs to, with their role. */
export const membershipSchema = organizationSchema.extend({ role });
export const membershipListSchema = z.array(membershipSchema);

export const memberSchema = z.object({
	userId: z.string(),
	email: z.string(),
	role,
	createdAt: z.string(),
});
export const memberListSchema = z.array(memberSchema);

export const removedMemberSchema = z.object({ userId: z.string() });

/** `data` of `POST /auth/switch-organization`: an access token for that organization. */
export const switchedOrganizationSchema = z.object({
	accessToken: z.string(),
	organizationId: z.string(),
	role,
});

export const createTeamFormSchema = z.object({
	name: z.string().trim().min(1, "Name the team").max(120, "At most 120 characters"),
});

export const addMemberFormSchema = z.object({
	email: z.email("Enter a valid email address").trim(),
	role,
});
