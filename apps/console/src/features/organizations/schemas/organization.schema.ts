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

/** A pending emailed invitation (the token is only ever in the email). */
export const invitationSchema = z.object({
	id: z.string(),
	email: z.string(),
	role,
	expiresAt: z.string(),
	createdAt: z.string(),
});
export const invitationListSchema = z.array(invitationSchema);

/** `GET|PUT /sso/connection`: the active team's single sign-on settings. */
export const ssoConnectionSchema = z.object({
	issuer: z.string(),
	clientId: z.string(),
	hasClientSecret: z.boolean(),
	defaultRole: role,
	redirectUri: z.string(),
	dnsRecord: z.object({ name: z.string(), value: z.string() }),
	domains: z.array(z.object({ domain: z.string(), verifiedAt: z.string().nullable() })),
	updatedAt: z.string(),
});

/** Domains typed as a list: commas, spaces or new lines. */
const domainList = z
	.string()
	.transform((value) =>
		value
			.split(/[\s,]+/)
			.map((item) => item.trim().toLowerCase())
			.filter(Boolean),
	)
	.pipe(
		z
			.array(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Use domains such as example.com"))
			.min(1, "Add at least one email domain")
			.max(10, "At most 10 domains"),
	);

export const ssoFormSchema = z.object({
	issuer: z.url("Enter the issuer URL from your identity provider"),
	clientId: z.string().trim().min(1, "Enter the client ID"),
	clientSecret: z.string().optional(),
	domains: domainList,
	defaultRole: z.enum(["member", "admin"]),
});
