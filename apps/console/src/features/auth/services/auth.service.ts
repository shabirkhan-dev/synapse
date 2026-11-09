import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { setSession } from "@/lib/api/session";

import { signedInSchema } from "../schemas/auth.schema";
import type { SignedIn, SignInInput } from "../types/auth.types";

export const authService = {
	/** Signs in and keeps the session's tokens for the API client. */
	async signIn(input: SignInInput): Promise<SignedIn> {
		const signedIn = await api(endpoints.auth.signIn, {
			method: "POST",
			body: input,
			auth: false,
			schema: signedInSchema,
		});
		setSession(signedIn.tokens);
		return signedIn;
	},

	/** Revokes the session on the API, then forgets it locally (even if the API call failed). */
	async signOut(): Promise<void> {
		try {
			await api(endpoints.auth.signOut, { method: "POST", schema: z.null() });
		} finally {
			setSession(null);
		}
	},
};
