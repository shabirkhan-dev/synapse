import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { AUTH_MESSAGES } from "../constants/auth.constants";
import {
	mfaCodeBodySchema,
	mfaRecoveryCodesSchema,
	mfaSetupSchema,
	mfaStatusSchema,
} from "../schemas/auth.schemas";
import type { MfaService } from "../services/mfa.service";

const tags = ["Two-step sign-in"];
const security = [{ bearerAuth: [] }];
const json = <T extends Parameters<typeof successEnvelope>[0]>(schema: T, description: string) => ({
	description,
	content: { "application/json": { schema: successEnvelope(schema) } },
});

const statusRoute = createRoute({
	method: "get",
	path: "/",
	tags,
	summary: "Whether two-step sign-in is on, and how many recovery codes are left",
	security,
	responses: { 200: json(mfaStatusSchema, "Status"), ...errorResponses },
});

const setupRoute = createRoute({
	method: "post",
	path: "/setup",
	tags,
	summary: "Start setting up: a new secret and its otpauth:// link (it is on only after /enable)",
	security,
	responses: {
		200: json(mfaSetupSchema, "Scan or type this into an authenticator app"),
		...errorResponses,
	},
});

const enableRoute = createRoute({
	method: "post",
	path: "/enable",
	tags,
	summary: "Turn it on with a first code; returns ten one-time recovery codes (shown once)",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: mfaCodeBodySchema } } },
	},
	responses: { 200: json(mfaRecoveryCodesSchema, "On"), ...errorResponses },
});

const disableRoute = createRoute({
	method: "post",
	path: "/disable",
	tags,
	summary: "Turn it off with a current code or a recovery code",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: mfaCodeBodySchema } } },
	},
	responses: { 200: json(mfaStatusSchema, "Off"), ...errorResponses },
});

/** Mounted at `/auth/mfa`, behind authentication and the session-only guard (no API keys). */
export function createMfaRoutes(mfa: MfaService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(statusRoute, async (c) => {
		const status = await mfa.status(c.get("user").sub);
		return success(c, status, AUTH_MESSAGES.MFA_STATUS, HTTP_STATUS.OK);
	});

	app.openapi(setupRoute, async (c) => {
		const setup = await mfa.setup(c.get("user").sub);
		return success(c, setup, AUTH_MESSAGES.MFA_SETUP_STARTED, HTTP_STATUS.OK);
	});

	app.openapi(enableRoute, async (c) => {
		const recoveryCodes = await mfa.enable(c.get("user").sub, c.req.valid("json").code, {
			requestId: c.get("requestId"),
		});
		return success(c, { recoveryCodes }, AUTH_MESSAGES.MFA_ENABLED, HTTP_STATUS.OK);
	});

	app.openapi(disableRoute, async (c) => {
		const userId = c.get("user").sub;
		await mfa.disable(userId, c.req.valid("json").code, { requestId: c.get("requestId") });
		return success(c, await mfa.status(userId), AUTH_MESSAGES.MFA_DISABLED, HTTP_STATUS.OK);
	});

	return app;
}
