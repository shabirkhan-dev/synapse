import { z } from "@hono/zod-openapi";
import { ORGANIZATION_ROLES } from "@synapse/security";

export const organizationIdParamsSchema = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const memberParamsSchema = organizationIdParamsSchema.extend({
	userId: z.uuid().openapi({ param: { name: "userId", in: "path" } }),
});

export const createOrganizationBodySchema = z
	.object({ name: z.string().trim().min(1).max(120).openapi({ example: "Support team" }) })
	.openapi("CreateOrganizationBody");

export const saveMemberBodySchema = z
	.object({
		email: z.email().max(254).openapi({ example: "teammate@example.com" }),
		role: z.enum(ORGANIZATION_ROLES).default("member"),
	})
	.openapi("SaveMemberBody");

export const organizationSchema = z
	.object({
		id: z.uuid(),
		name: z.string(),
		kind: z.enum(["personal", "team"]),
		createdAt: z.string(),
	})
	.openapi("Organization");

export const membershipSchema = organizationSchema
	.extend({ role: z.enum(ORGANIZATION_ROLES) })
	.openapi("Membership");

export const memberSchema = z
	.object({
		userId: z.uuid(),
		email: z.string(),
		role: z.enum(ORGANIZATION_ROLES),
		createdAt: z.string(),
	})
	.openapi("Member");
