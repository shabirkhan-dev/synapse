import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { feedbackSchema, ragAnswerSchema } from "../schemas/playground.schema";
import type { AskedQuestion, QuestionInput, Rating } from "../types/playground.types";

export const playgroundService = {
	/**
	 * Ask over the user's documents. The console picks the request id (the API keeps a well-formed
	 * `x-request-id`), so feedback can point at this exact answer without reading response headers.
	 */
	async ask({ query, topK }: QuestionInput): Promise<AskedQuestion> {
		const requestId = `console_${crypto.randomUUID()}`;
		const answer = await api(endpoints.rag.query, {
			method: "POST",
			body: { query, topK },
			headers: { "x-request-id": requestId },
			schema: ragAnswerSchema,
		});
		return { ...answer, question: query, requestId };
	},

	/** Thumbs up/down on an answer; rating it again replaces the earlier rating. */
	sendFeedback: (input: { requestId: string; rating: Rating; comment?: string }) =>
		api(endpoints.oversight.feedback, { method: "POST", body: input, schema: feedbackSchema }),
};
