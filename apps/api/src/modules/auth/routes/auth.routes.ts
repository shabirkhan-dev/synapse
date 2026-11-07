import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { AUTH_MAX_BODY_BYTES, AUTH_MESSAGES } from "../constants/auth.constants";
import {
	authTokensSchema,
	refreshBodySchema,
	signedInSchema,
	signInBodySchema,
	signUpBodySchema,
	userSchema,
} from "../schemas/auth.schemas";
import type { AuthService } from "../services/auth.service";

const tags = ["Auth"];
const security = [{ bearerAuth: [] }];

const smallBody = bodyLimit({
	maxSize: AUTH_MAX_BODY_BYTES,
	onError: () => {
		throw new AppError({
			statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
			code: ERROR_CODES.PAYLOAD_TOO_LARGE,
			message: AUTH_MESSAGES.BODY_TOO_LARGE,
		});
	},
});

const jsonBody = <TSchema extends z.ZodType>(schema: TSchema) => ({
	required: true,
	content: { "application/json": { schema } },
});

const signUpRoute = createRoute({
	method: "post",
	path: "/sign-up",
	tags,
	summary: "Create an account and start a session",
	middleware: [smallBody] as const,
	request: { body: jsonBody(signUpBodySchema) },
	responses: {
		201: {
			description: "Account created; tokens for the new session",
			content: { "application/json": { schema: successEnvelope(signedInSchema) } },
		},
		409: {
			description: "Email already registered",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...errorResponses,
	},
});

const signInRoute = createRoute({
	method: "post",
	path: "/sign-in",
	tags,
	summary: "Sign in with email and password",
	middleware: [smallBody] as const,
	request: { body: jsonBody(signInBodySchema) },
	responses: {
		200: {
			description: "Tokens for a new session",
			content: { "application/json": { schema: successEnvelope(signedInSchema) } },
		},
		...errorResponses,
	},
});

const refreshRoute = createRoute({
	method: "post",
	path: "/refresh",
	tags,
	summary: "Swap a refresh token for new tokens (the old refresh token stops working)",
	middleware: [smallBody] as const,
	request: { body: jsonBody(refreshBodySchema) },
	responses: {
		200: {
			description: "New access and refresh tokens for the same session",
			content: { "application/json": { schema: successEnvelope(authTokensSchema) } },
		},
		...errorResponses,
	},
});

const signOutRoute = createRoute({
	method: "post",
	path: "/sign-out",
	tags,
	summary: "End the current session (its refresh token stops working)",
	security,
	responses: {
		200: {
			description: "Session revoked; the access token expires on its own",
			content: { "application/json": { schema: successEnvelope(z.null()) } },
		},
		...errorResponses,
	},
});

const meRoute = createRoute({
	method: "get",
	path: "/me",
	tags,
	summary: "The signed-in user",
	security,
	responses: {
		200: {
			description: "Current user",
			content: { "application/json": { schema: successEnvelope(userSchema) } },
		},
		...errorResponses,
	},
});

export function createAuthRoutes(auth: AuthService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(signUpRoute, async (c) => {
		const signedUp = await auth.signUp(c.req.valid("json"));
		return success(c, signedUp, AUTH_MESSAGES.SIGNED_UP, HTTP_STATUS.CREATED);
	});

	app.openapi(signInRoute, async (c) => {
		const signedIn = await auth.signIn(c.req.valid("json"));
		return success(c, signedIn, AUTH_MESSAGES.SIGNED_IN);
	});

	app.openapi(refreshRoute, async (c) => {
		const tokens = await auth.refresh(c.req.valid("json").refreshToken);
		return success(c, tokens, AUTH_MESSAGES.REFRESHED);
	});

	app.openapi(signOutRoute, async (c) => {
		await auth.signOut(c.get("user"));
		return success(c, null, AUTH_MESSAGES.SIGNED_OUT);
	});

	app.openapi(meRoute, async (c) => {
		const user = await auth.currentUser(c.get("user"));
		return success(c, user, AUTH_MESSAGES.USER_FETCHED);
	});

	return app;
}
