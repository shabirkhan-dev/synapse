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
