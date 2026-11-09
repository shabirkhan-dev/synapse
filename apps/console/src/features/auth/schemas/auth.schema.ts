import { z } from "zod";

export const signInFormSchema = z.object({
	email: z.email("Enter a valid email address").trim(),
	password: z.string().min(1, "Enter your password"),
});

/** `data` of `POST /auth/sign-in` (only what the console keeps). */
export const signedInSchema = z.object({
	user: z.object({ id: z.string(), email: z.string() }),
	tokens: z.object({ accessToken: z.string(), refreshToken: z.string() }),
});
