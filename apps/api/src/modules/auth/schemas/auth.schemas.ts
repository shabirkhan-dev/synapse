import { z } from "@hono/zod-openapi";
import { PASSWORD_POLICY } from "@synapse/security";

const email = z.string().trim().pipe(z.email().max(254)).openapi({ example: "ada@example.com" });

const newPassword = z
	.string()
	.min(PASSWORD_POLICY.minLength)
	.max(PASSWORD_POLICY.maxLength)
	.openapi({ example: "correct horse battery staple" });

/** Token from an emailed link (`?token=`). */
const linkToken = z.string().min(1).max(512);

/**
 * Where the refresh token goes: in the response body (default), or — for the console — an
 * httpOnly cookie the page cannot read (ADR-0007); the body then omits it.
 */
const sessionTransport = z
	.enum(["body", "cookie"])
	.default("body")
	.openapi({ description: "`cookie`: refresh token in an httpOnly cookie, not the body" });

export const signUpBodySchema = z
	.object({ email, password: newPassword, session: sessionTransport })
	.openapi("SignUpBody");

/** Sign-in does not re-check the policy: a wrong password gets the same answer either way. */
export const signInBodySchema = z
	.object({
		email,
		password: z.string().min(1).max(PASSWORD_POLICY.maxLength),
		session: sessionTransport,
	})
	.openapi("SignInBody");

/** Without `refreshToken`, the cookie set by a `session: "cookie"` sign-in is used. */
export const refreshBodySchema = z
	.object({ refreshToken: z.string().min(1).max(512).optional() })
	.openapi("RefreshBody");

export const verifyEmailBodySchema = z.object({ token: linkToken }).openapi("VerifyEmailBody");

export const forgotPasswordBodySchema = z.object({ email }).openapi("ForgotPasswordBody");

export const resetPasswordBodySchema = z
	.object({ token: linkToken, password: newPassword })
	.openapi("ResetPasswordBody");

export const userSchema = z
	.object({
		id: z.uuid(),
		email: z.string(),
		emailVerifiedAt: z.string().nullable(),
		createdAt: z.string(),
	})
	.openapi("User");

export const authTokensSchema = z
	.object({
		tokenType: z.literal("Bearer"),
		accessToken: z.string(),
		accessTokenExpiresAt: z.string(),
		/** Absent when the refresh token travels in the httpOnly cookie. */
		refreshToken: z.string().optional(),
		refreshTokenExpiresAt: z.string().optional(),
	})
	.openapi("AuthTokens");

export const signedInSchema = z
	.object({ user: userSchema, tokens: authTokensSchema })
	.openapi("SignedIn");

export const switchOrganizationBodySchema = z
	.object({ organizationId: z.uuid() })
	.openapi("SwitchOrganizationBody");

export const switchedOrganizationSchema = z
	.object({
		tokenType: z.literal("Bearer"),
		accessToken: z.string(),
		accessTokenExpiresAt: z.string(),
		organizationId: z.uuid(),
		role: z.enum(["owner", "admin", "member"]),
	})
	.openapi("SwitchedOrganization");
