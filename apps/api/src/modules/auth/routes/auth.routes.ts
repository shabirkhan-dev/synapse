import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AuthConfig } from "@/config";
import type { AppBindings } from "@/shared/types/app-types";

import { AUTH_ERROR_CODES, AUTH_MAX_BODY_BYTES, AUTH_MESSAGES } from "../constants/auth.constants";
import {
	authTokensSchema,
	forgotPasswordBodySchema,
	refreshBodySchema,
	resetPasswordBodySchema,
	signedInSchema,
	signInBodySchema,
	signUpBodySchema,
	switchedOrganizationSchema,
	switchOrganizationBodySchema,
	currentUserSchema,
	userSchema,
	verifyEmailBodySchema,
} from "../schemas/auth.schemas";
import type { AuthService } from "../services/auth.service";
import { clientIp } from "./client-ip";
import { clearRefreshCookie, moveRefreshTokenToCookie, readRefreshCookie } from "./session-cookie";

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

const rateLimited = {
	429: {
		description: "Too many attempts; `error.details[0].retryAfterSeconds` says when to retry",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;

const invalidLink = {
	400: {
		description: "Link invalid, expired or already used",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;

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
		...rateLimited,
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
		...rateLimited,
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
	summary: "The signed-in user, with the active organization and their role in it",
	security,
	responses: {
		200: {
			description: "Current user",
			content: { "application/json": { schema: successEnvelope(currentUserSchema) } },
		},
		...errorResponses,
	},
});

const verifyEmailRoute = createRoute({
	method: "post",
	path: "/verify-email",
	tags,
	summary: "Confirm an email address with the token from the verification link",
	middleware: [smallBody] as const,
	request: { body: jsonBody(verifyEmailBodySchema) },
	responses: {
		200: {
			description: "Email verified",
			content: { "application/json": { schema: successEnvelope(userSchema) } },
		},
		...invalidLink,
		...errorResponses,
	},
});

const resendVerificationRoute = createRoute({
	method: "post",
	path: "/verify-email/resend",
	tags,
	summary: "Email a new verification link to the signed-in user",
	security,
	responses: {
		202: {
			description: "Link sent, or the email was already verified (see `message`)",
			content: { "application/json": { schema: successEnvelope(z.null()) } },
		},
		...rateLimited,
		...errorResponses,
	},
});

const forgotPasswordRoute = createRoute({
	method: "post",
	path: "/password/forgot",
	tags,
	summary: "Email a password-reset link (same answer whether or not the account exists)",
	middleware: [smallBody] as const,
	request: { body: jsonBody(forgotPasswordBodySchema) },
	responses: {
		202: {
			description: "Accepted",
			content: { "application/json": { schema: successEnvelope(z.null()) } },
		},
		...rateLimited,
		...errorResponses,
	},
});

const resetPasswordRoute = createRoute({
	method: "post",
	path: "/password/reset",
	tags,
	summary: "Set a new password with the token from the reset link; signs out every session",
	middleware: [smallBody] as const,
	request: { body: jsonBody(resetPasswordBodySchema) },
	responses: {
		200: {
			description: "Password changed",
			content: { "application/json": { schema: successEnvelope(z.null()) } },
		},
		...invalidLink,
		...errorResponses,
	},
});

const switchOrganizationRoute = createRoute({
	method: "post",
	path: "/switch-organization",
	tags,
	summary: "Act in another organization you belong to: returns a new access token for it",
	security,
	middleware: [smallBody] as const,
	request: { body: jsonBody(switchOrganizationBodySchema) },
	responses: {
		200: {
			description: "Access token for the organization (the refresh token keeps working)",
			content: { "application/json": { schema: successEnvelope(switchedOrganizationSchema) } },
		},
		404: {
			description: "Not a member of that organization",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...errorResponses,
	},
});

export function createAuthRoutes(
	auth: AuthService,
	{ trustProxy, cookie }: Pick<AuthConfig, "trustProxy" | "cookie">,
) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(signUpRoute, async (c) => {
		const { session, ...input } = c.req.valid("json");
		const signedUp = await auth.signUp(input, clientIp(c, trustProxy), {
			requestId: c.get("requestId"),
		});
		const body =
			session === "cookie"
				? { ...signedUp, tokens: moveRefreshTokenToCookie(c, signedUp.tokens, cookie) }
				: signedUp;
		return success(c, body, AUTH_MESSAGES.SIGNED_UP, HTTP_STATUS.CREATED);
	});

	app.openapi(signInRoute, async (c) => {
		const { session, ...input } = c.req.valid("json");
		const signedIn = await auth.signIn(input, clientIp(c, trustProxy), {
			requestId: c.get("requestId"),
		});
		const body =
			session === "cookie"
				? { ...signedIn, tokens: moveRefreshTokenToCookie(c, signedIn.tokens, cookie) }
				: signedIn;
		return success(c, body, AUTH_MESSAGES.SIGNED_IN);
	});

	// A body token wins; otherwise the cookie. The JSON body is required (the route validates its
	// content type), so a cross-origin page cannot trigger a cookie refresh without a CORS preflight.
	app.openapi(refreshRoute, async (c) => {
		const fromBody = c.req.valid("json").refreshToken;
		const fromCookie = fromBody ? undefined : readRefreshCookie(c, cookie);
		try {
			const tokens = await auth.refresh(fromBody ?? fromCookie ?? "");
			const body = fromCookie ? moveRefreshTokenToCookie(c, tokens, cookie) : tokens;
			return success(c, body, AUTH_MESSAGES.REFRESHED);
		} catch (error) {
			// A dead token is dropped; an outage (e.g. the database) keeps the cookie for a retry.
			const dead =
				error instanceof AppError && error.code === AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID;
			if (fromCookie && dead) clearRefreshCookie(c, cookie);
			throw error;
		}
	});

	app.openapi(signOutRoute, async (c) => {
		clearRefreshCookie(c, cookie);
		await auth.signOut(c.get("user"), { requestId: c.get("requestId") });
		return success(c, null, AUTH_MESSAGES.SIGNED_OUT);
	});

	app.openapi(meRoute, async (c) => {
		const me = await auth.me(c.get("user"));
		return success(c, me, AUTH_MESSAGES.USER_FETCHED);
	});

	app.openapi(verifyEmailRoute, async (c) => {
		const user = await auth.verifyEmail(c.req.valid("json").token, {
			requestId: c.get("requestId"),
		});
		return success(c, user, AUTH_MESSAGES.EMAIL_VERIFIED);
	});

	app.openapi(resendVerificationRoute, async (c) => {
		const sent = await auth.resendVerification(c.get("user"));
		const message = sent ? AUTH_MESSAGES.VERIFICATION_SENT : AUTH_MESSAGES.ALREADY_VERIFIED;
		return success(c, null, message, HTTP_STATUS.ACCEPTED);
	});

	app.openapi(forgotPasswordRoute, async (c) => {
		await auth.requestPasswordReset(c.req.valid("json").email, clientIp(c, trustProxy));
		return success(c, null, AUTH_MESSAGES.RESET_REQUESTED, HTTP_STATUS.ACCEPTED);
	});

	app.openapi(resetPasswordRoute, async (c) => {
		const { token, password } = c.req.valid("json");
		await auth.resetPassword(token, password, { requestId: c.get("requestId") });
		return success(c, null, AUTH_MESSAGES.PASSWORD_RESET);
	});

	app.openapi(switchOrganizationRoute, async (c) => {
		const switched = await auth.switchOrganization(
			c.get("user"),
			c.req.valid("json").organizationId,
			{
				requestId: c.get("requestId"),
			},
		);
		return success(c, switched, AUTH_MESSAGES.ORGANIZATION_SWITCHED, HTTP_STATUS.OK);
	});

	return app;
}
