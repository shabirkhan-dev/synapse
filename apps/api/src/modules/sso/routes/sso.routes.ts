import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { SSO_MESSAGES } from "../constants/sso.constants";
import {
	connectionOrNullSchema,
	connectionSchema,
	saveConnectionBodySchema,
} from "../schemas/sso.schemas";
import type { SsoService } from "../services/sso.service";

const tags = ["Single sign-on"];
const security = [{ bearerAuth: [] }];
const json = <T extends Parameters<typeof successEnvelope>[0]>(schema: T, description: string) => ({
	description,
	content: { "application/json": { schema: successEnvelope(schema) } },
});

const getRoute = createRoute({
	method: "get",
	path: "/connection",
	tags,
	summary: "The active team's single sign-on settings (admins and owners); `null` when none",
	security,
	responses: { 200: json(connectionOrNullSchema, "Settings"), ...errorResponses },
});

const putRoute = createRoute({
	method: "put",
	path: "/connection",
	tags,
	summary: "Set up or change the active team's OpenID Connect provider (owners)",
	description:
		"The issuer's discovery document is read to check it. Domains start unverified: add the DNS TXT record, then `POST /sso/connection/verify`.",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: saveConnectionBodySchema } } },
	},
	responses: { 200: json(connectionSchema, "Saved"), ...errorResponses },
});

const deleteRoute = createRoute({
	method: "delete",
	path: "/connection",
	tags,
	summary: "Turn single sign-on off for the active team (owners); accounts stay",
	security,
	responses: { 200: json(connectionOrNullSchema, "Off"), ...errorResponses },
});

const verifyRoute = createRoute({
	method: "post",
	path: "/connection/verify",
	tags,
	summary: "Look up each unverified domain's DNS TXT record (owners)",
	security,
	responses: { 200: json(connectionSchema, "Checked"), ...errorResponses },
});

/** Mounted at `/sso`, behind authentication. Acts on the caller's active organization. */
export function createSsoRoutes(sso: SsoService) {
	const app = new OpenAPIHono<AppBindings>();
	const context = (c: { get(key: "requestId"): string }) => ({ requestId: c.get("requestId") });

	app.openapi(getRoute, async (c) => {
		const connection = await sso.view(c.get("user"));
		return success(c, connection, SSO_MESSAGES.CONNECTION_FETCHED, HTTP_STATUS.OK);
	});

	app.openapi(putRoute, async (c) => {
		const saved = await sso.save(c.get("user"), c.req.valid("json"), context(c));
		return success(c, saved, SSO_MESSAGES.CONNECTION_SAVED, HTTP_STATUS.OK);
	});

	app.openapi(deleteRoute, async (c) => {
		await sso.remove(c.get("user"), context(c));
		return success(c, null, SSO_MESSAGES.CONNECTION_DELETED, HTTP_STATUS.OK);
	});

	app.openapi(verifyRoute, async (c) => {
		const checked = await sso.verifyDomains(c.get("user"), context(c));
		return success(c, checked, SSO_MESSAGES.DOMAINS_CHECKED, HTTP_STATUS.OK);
	});

	return app;
}
