import type { z } from "zod";

import type { mfaSetupSchema, mfaStatusSchema } from "../schemas/mfa.schema";

export type MfaStatus = z.infer<typeof mfaStatusSchema>;
export type MfaSetup = z.infer<typeof mfaSetupSchema>;
