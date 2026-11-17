import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { followUpsSchema } from "../schemas/follow-ups.schema";

export const followUpsService = {
	/** Up to three questions to ask next about an answer (one chat model call on the API). */
	suggest: async (input: { question: string; answer: string }): Promise<string[]> =>
		(
			await api(endpoints.rag.followUps, {
				method: "POST",
				body: input,
				schema: followUpsSchema,
			})
		).questions,
};
