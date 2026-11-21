import { z } from "zod";

export const mfaStatusSchema = z.object({ enabled: z.boolean(), recoveryCodesLeft: z.number() });
export const mfaSetupSchema = z.object({ secret: z.string(), uri: z.string() });
export const mfaRecoveryCodesSchema = z.object({ recoveryCodes: z.array(z.string()) });

export const mfaCodeFormSchema = z.object({
	code: z.string().trim().min(6, "Enter the 6-digit code").max(32, "That is longer than any code"),
});
