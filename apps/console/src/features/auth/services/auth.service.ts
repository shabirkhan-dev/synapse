import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { setAccessToken } from "@/lib/api/session";

import { currentUserSchema, signedInSchema, verifiedUserSchema } from "../schemas/auth.schema";
import type {
	ForgotPasswordInput,
	ResetPasswordInput,
	SignedIn,
	SignInInput,
	SignUpInput,
} from "../types/auth.types";

/** Sign-in and sign-up ask for the cookie transport (ADR-0007) and keep only the access token. */
async function startSession(path: string, body: Record<string, unknown>): Promise<SignedIn> {
	const signedIn = await api(path, {
		method: "POST",
		body: { ...body, session: "cookie" },
		auth: false,
		schema: signedInSchema,
	});
	setAccessToken(signedIn.tokens.accessToken);
	return signedIn;
}

export const authService = {
	signIn: ({ email, password }: SignInInput) =>
		startSession(endpoints.auth.signIn, { email, password }),

	/** Creates the account and signs in; the API emails a verification link. */
	signUp: ({ email, password }: SignUpInput) =>
		startSession(endpoints.auth.signUp, { email, password }),

	/** Revokes the session and clears the cookie on the API, then forgets it locally (always). */
	async signOut(): Promise<void> {
		try {
			await api(endpoints.auth.signOut, { method: "POST", schema: z.null() });
		} finally {
			setAccessToken(null);
		}
	},

	/** The signed-in user, the active organization and their role in it (`GET /auth/me`). */
	currentUser: () => api(endpoints.auth.me, { schema: currentUserSchema }),

	/** Uses the emailed link's single-use token. */
	verifyEmail: (token: string) =>
		api(endpoints.auth.verifyEmail, {
			method: "POST",
			body: { token },
			auth: false,
			schema: verifiedUserSchema,
		}),

	/** Always answers the same, whether or not the email has an account. */
	requestPasswordReset: ({ email }: ForgotPasswordInput) =>
		api(endpoints.auth.forgotPassword, {
			method: "POST",
			body: { email },
			auth: false,
			schema: z.null(),
		}),

	resetPassword: ({ token, password }: ResetPasswordInput) =>
		api(endpoints.auth.resetPassword, {
			method: "POST",
			body: { token, password },
			auth: false,
			schema: z.null(),
		}),
};
