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
	forgotPasswordBodySchema,
	refreshBodySchema,
	resetPasswordBodySchema,
	signedInSchema,
	signInBodySchema,
	signUpBodySchema,
	userSchema,
	verifyEmailBodySchema,
} from "../schemas/auth.schemas";
import type { AuthService } from "../services/auth.service";
import { clientIp } from "./client-ip";

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

export function createAuthRoutes(auth: AuthService, { trustProxy }: { trustProxy: boolean }) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(signUpRoute, async (c) => {
		const signedUp = await auth.signUp(c.req.valid("json"), clientIp(c, trustProxy), {
			requestId: c.get("requestId"),
		});
		return success(c, signedUp, AUTH_MESSAGES.SIGNED_UP, HTTP_STATUS.CREATED);
	});

	app.openapi(signInRoute, async (c) => {
		const signedIn = await auth.signIn(c.req.valid("json"), clientIp(c, trustProxy), {
			requestId: c.get("requestId"),
		});
		return success(c, signedIn, AUTH_MESSAGES.SIGNED_IN);
	});

	app.openapi(refreshRoute, async (c) => {
		const tokens = await auth.refresh(c.req.valid("json").refreshToken);
		return success(c, tokens, AUTH_MESSAGES.REFRESHED);
	});

	app.openapi(signOutRoute, async (c) => {
		await auth.signOut(c.get("user"), { requestId: c.get("requestId") });
		return success(c, null, AUTH_MESSAGES.SIGNED_OUT);
	});

	app.openapi(meRoute, async (c) => {
		const user = await auth.currentUser(c.get("user"));
		return success(c, user, AUTH_MESSAGES.USER_FETCHED);
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

	return app;
}
