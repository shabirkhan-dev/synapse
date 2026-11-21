import type { z } from "zod";

import type {
	forgotPasswordFormSchema,
	resetPasswordFormSchema,
	signedInSchema,
	signInFormSchema,
	signUpFormSchema,
} from "../schemas/auth.schema";

export type SignInInput = z.infer<typeof signInFormSchema>;
export type SignUpInput = z.infer<typeof signUpFormSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordFormSchema> & { token: string };
export type SignedIn = z.infer<typeof signedInSchema>;
/** A password sign-in: done, or waiting for the second-step code. */
export type SignInOutcome =
	| { kind: "signed-in"; signedIn: SignedIn }
	| { kind: "mfa"; challenge: string };
