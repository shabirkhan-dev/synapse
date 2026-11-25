import { z } from "zod";

import { ORGANIZATION_ROLES } from "@/lib/permissions";

import { PASSWORD_RULES } from "../constants/auth.constants";

const email = z.email("Enter a valid email address").trim();
const newPassword = z
	.string()
	.min(PASSWORD_RULES.MIN, `Use at least ${PASSWORD_RULES.MIN} characters`)
	.max(PASSWORD_RULES.MAX, `Use at most ${PASSWORD_RULES.MAX} characters`);

export const signInFormSchema = z.object({
	email,
	password: z.string().min(1, "Enter your password"),
});

/** The new password typed twice; `confirm` never leaves the browser. */
const passwordsMatch = (value: { password: string; confirm: string }) =>
	value.password === value.confirm;
const mismatch = { path: ["confirm"], message: "The passwords do not match" };

export const signUpFormSchema = z
	.object({ email, password: newPassword, confirm: z.string() })
	.refine(passwordsMatch, mismatch);

export const resetPasswordFormSchema = z
	.object({ password: newPassword, confirm: z.string() })
	.refine(passwordsMatch, mismatch);

export const forgotPasswordFormSchema = z.object({ email });

const user = z.object({
	id: z.string(),
	email: z.string(),
	emailVerifiedAt: z.string().nullable(),
});

/** `data` of sign-in / sign-up with `session: "cookie"`: the refresh token is in the cookie. */
export const signedInSchema = z.object({ user, tokens: z.object({ accessToken: z.string() }) });

/** `POST /auth/sign-in`: a session, or (two-step sign-in on) a challenge for the code step. */
export const signInResultSchema = z.union([
	z.object({ mfaRequired: z.literal(true), challenge: z.string() }),
	signedInSchema,
]);

/** The second step: six digits, or a recovery code (`xxxxx-xxxxx`). */
export const signInCodeFormSchema = z.object({
	code: z
		.string()
		.trim()
		.min(6, "Enter the 6-digit code, or a recovery code")
		.max(32, "That is longer than any code"),
});

/** `data` of `POST /auth/verify-email`. */
export const verifiedUserSchema = user;

/** `data` of `GET /auth/me`: the user and the organization the access token acts in. */
export const currentUserSchema = user.extend({
	organization: z.object({ id: z.string(), role: z.enum(ORGANIZATION_ROLES) }),
});

/** `POST /auth/sso/start`: where to send the browser. */
export const ssoStartSchema = z.object({ authorizationUrl: z.url() });

export const ssoFormSchema = z.object({
	email: z.string().trim().pipe(z.email("Enter your work email")),
});
