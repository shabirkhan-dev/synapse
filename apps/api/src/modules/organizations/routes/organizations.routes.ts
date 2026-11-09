import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { ORGANIZATION_MESSAGES } from "../constants/organizations.constants";
import {
	createOrganizationBodySchema,
	memberParamsSchema,
	memberSchema,
	membershipSchema,
	organizationIdParamsSchema,
	organizationSchema,
	saveMemberBodySchema,
} from "../schemas/organizations.schemas";
import type { OrganizationsService } from "../services/organizations.service";

const tags = ["Organizations"];
const security = [{ bearerAuth: [] }];
const json = <T extends z.ZodType>(schema: T, description: string) => ({
	description,
	content: { "application/json": { schema: successEnvelope(schema) } },
});
const errors = {
	403: {
		description: "Role does not allow this",
		content: { "application/json": { schema: apiErrorSchema } },
	},
	404: {
		description: "Not found or not a member",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;

const listRoute = createRoute({
	method: "get",
	path: "/",
	tags,
	summary: "Organizations you belong to, with your role (the personal one first)",
	security,
	responses: { 200: json(z.array(membershipSchema), "Memberships"), ...errorResponses },
});

const createRouteDef = createRoute({
	method: "post",
	path: "/",
	tags,
	summary: "Create a team organization; you become its owner",
	security,
	request: {
		body: {
			required: true,
			content: { "application/json": { schema: createOrganizationBodySchema } },
		},
	},
	responses: { 201: json(organizationSchema, "Created"), ...errorResponses },
});

const membersRoute = createRoute({
	method: "get",
	path: "/{id}/members",
	tags,
	summary: "Members and their roles",
	security,
	request: { params: organizationIdParamsSchema },
	responses: { 200: json(z.array(memberSchema), "Members"), ...errors, ...errorResponses },
});

const saveMemberRoute = createRoute({
	method: "post",
	path: "/{id}/members",
	tags,
	summary:
		"Add an existing account by email, or change a member's role (admins; owners for admin/owner roles)",
	security,
	request: {
		params: organizationIdParamsSchema,
		body: { required: true, content: { "application/json": { schema: saveMemberBodySchema } } },
	},
	responses: {
		200: json(z.array(memberSchema), "Members after the change"),
		...errors,
		...errorResponses,
	},
});

const removeMemberRoute = createRoute({
	method: "delete",
	path: "/{id}/members/{userId}",
	tags,
	summary: "Remove a member (their access ends on their next request)",
	security,
	request: { params: memberParamsSchema },
	responses: { 200: json(z.object({ userId: z.uuid() }), "Removed"), ...errors, ...errorResponses },
});

const ctx = (requestId: string) => ({ requestId });

export function createOrganizationRoutes(organizations: OrganizationsService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(listRoute, async (c) => {
		const memberships = await organizations.listMine(c.get("user").sub);
		return success(c, memberships, ORGANIZATION_MESSAGES.FETCHED);
	});

	app.openapi(createRouteDef, async (c) => {
		const { name } = c.req.valid("json");
		const organization = await organizations.create(c.get("user"), name, ctx(c.get("requestId")));
		return success(c, organization, ORGANIZATION_MESSAGES.CREATED, HTTP_STATUS.CREATED);
	});

	app.openapi(membersRoute, async (c) => {
		const members = await organizations.members(c.get("user"), c.req.valid("param").id);
		return success(c, members, ORGANIZATION_MESSAGES.MEMBERS_FETCHED);
	});

	app.openapi(saveMemberRoute, async (c) => {
		const members = await organizations.saveMember(
			c.get("user"),
			c.req.valid("param").id,
			c.req.valid("json"),
			ctx(c.get("requestId")),
		);
		return success(c, members, ORGANIZATION_MESSAGES.MEMBER_SAVED);
	});

	app.openapi(removeMemberRoute, async (c) => {
		const { id, userId } = c.req.valid("param");
		await organizations.removeMember(c.get("user"), id, userId, ctx(c.get("requestId")));
		return success(c, { userId }, ORGANIZATION_MESSAGES.MEMBER_REMOVED);
	});

	return app;
}
