import { z } from "zod";

export const followUpsSchema = z.object({
	questions: z.array(z.string()),
	chatModel: z.string(),
	promptVersion: z.string(),
});
