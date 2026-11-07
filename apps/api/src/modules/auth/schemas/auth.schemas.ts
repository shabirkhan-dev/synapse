import { z } from "@hono/zod-openapi";
import { PASSWORD_POLICY } from "@synapse/security";

const email = z.string().trim().pipe(z.email().max(254)).openapi({ example: "ada@example.com" });

export const signUpBodySchema = z
	.object({
		email,
		password: z
			.string()
			.min(PASSWORD_POLICY.minLength)
			.max(PASSWORD_POLICY.maxLength)
			.openapi({ example: "correct horse battery staple" }),
	})
	.openapi("SignUpBody");

/** Sign-in does not re-check the policy: a wrong password gets the same answer either way. */
export const signInBodySchema = z
	.object({
		email,
		password: z.string().min(1).max(PASSWORD_POLICY.maxLength),
	})
	.openapi("SignInBody");

export const refreshBodySchema = z
	.object({ refreshToken: z.string().min(1).max(512) })
	.openapi("RefreshBody");

export const userSchema = z
	.object({ id: z.uuid(), email: z.string(), createdAt: z.string() })
	.openapi("User");

export const authTokensSchema = z
	.object({
		tokenType: z.literal("Bearer"),
		accessToken: z.string(),
		accessTokenExpiresAt: z.string(),
		refreshToken: z.string(),
		refreshTokenExpiresAt: z.string(),
	})
	.openapi("AuthTokens");

export const signedInSchema = z
	.object({ user: userSchema, tokens: authTokensSchema })
	.openapi("SignedIn");
