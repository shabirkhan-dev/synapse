import type { z } from "zod";

import type { signedInSchema, signInFormSchema } from "../schemas/auth.schema";

export type SignInInput = z.infer<typeof signInFormSchema>;
export type SignedIn = z.infer<typeof signedInSchema>;
