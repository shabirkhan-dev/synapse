import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import type { AuthConfig } from "@/config";
import {
	clientInfo,
	clientIp,
	moveRefreshTokenToCookie,
	signedInSchema,
	smallBody,
} from "@/modules/auth";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { SSO_BROWSER_COOKIE, SSO_LIMITS, SSO_MESSAGES } from "../constants/sso.constants";
import { callbackBodySchema, startBodySchema, startResultSchema } from "../schemas/sso.schemas";
import type { SsoService } from "../services/sso.service";

const tags = ["Single sign-on"];

const startRoute = createRoute({
	method: "post",
	path: "/start",
	tags,
	summary: "Start signing in with the identity provider of this email's domain",
	description:
		"Only verified domains sign in this way (`404 SSO_NOT_CONFIGURED` otherwise). Send the browser to `authorizationUrl`; it comes back to the console's `/sso/callback`.",
	middleware: [smallBody] as const,
	request: {
		body: { required: true, content: { "application/json": { schema: startBodySchema } } },
	},
	responses: {
		200: {
			description: "Where to go",
			content: { "application/json": { schema: successEnvelope(startResultSchema) } },
		},
		...errorResponses,
	},
});

const callbackRoute = createRoute({
	method: "post",
	path: "/callback",
	tags,
	summary: "Finish signing in with the `code` and `state` the provider sent back",
	description:
		"Creates the account on first use and adds it to the team with the connection's role. Two-step sign-in is the provider's job here.",
	middleware: [smallBody] as const,
	request: {
		body: { required: true, content: { "application/json": { schema: callbackBodySchema } } },
	},
	responses: {
		200: {
			description: "Tokens for a new session in the team",
			content: { "application/json": { schema: successEnvelope(signedInSchema) } },
		},
		...errorResponses,
	},
});

/** Mounted at `/auth/sso`, without authentication (it is how people sign in). */
export function createSsoSignInRoutes(sso: SsoService, auth: AuthConfig) {
	const app = new OpenAPIHono<AppBindings>();

	// Ties the sign-in to this browser (login CSRF); sent only to these routes.
	const binding = {
		name: SSO_BROWSER_COOKIE,
		options: {
			httpOnly: true,
			secure: auth.cookie.secure,
			sameSite: "Strict",
			path: `${auth.cookie.path}/sso`,
		} as const,
	};

	app.openapi(startRoute, async (c) => {
		const { authorizationUrl, browserBinding } = await sso.start(
			c.req.valid("json").email,
			clientIp(c, auth.trustProxy),
		);
		setCookie(c, binding.name, browserBinding, {
			...binding.options,
			maxAge: SSO_LIMITS.STATE_TTL_SECONDS,
		});
		return success(c, { authorizationUrl }, SSO_MESSAGES.SIGN_IN_STARTED, HTTP_STATUS.OK);
	});

	app.openapi(callbackRoute, async (c) => {
		const { session, ...input } = c.req.valid("json");
		const browserBinding = getCookie(c, binding.name) || null;
		deleteCookie(c, binding.name, binding.options);
		const signedIn = await sso.complete(
			{ ...input, browserBinding },
			clientInfo(c, auth.trustProxy),
			{ requestId: c.get("requestId") },
		);
		const body =
			session === "cookie"
				? { ...signedIn, tokens: moveRefreshTokenToCookie(c, signedIn.tokens, auth.cookie) }
				: signedIn;
		return success(c, body, SSO_MESSAGES.SIGNED_IN, HTTP_STATUS.OK);
	});

	return app;
}
