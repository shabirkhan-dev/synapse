import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { MODES } from "../constants/retrieval.constants";
import { retrievalResultSchema } from "../schemas/retrieval.schema";
import type { CompareInput, ModeResult } from "../types/retrieval.types";

export const retrievalService = {
	/** The same query through every search mode at once; no answer is generated. */
	async compare({ query, topK }: CompareInput): Promise<ModeResult[]> {
		const settled = await Promise.allSettled(
			MODES.map(({ mode }) =>
				api(endpoints.rag.query, {
					method: "POST",
					body: { query, topK, answer: false, mode },
					schema: retrievalResultSchema,
				}),
			),
		);
		return settled.map((outcome, index): ModeResult => {
			const mode = MODES[index]?.mode ?? "hybrid";
			return outcome.status === "fulfilled"
				? { mode, status: "ok", matches: outcome.value.matches }
				: {
						mode,
						status: "failed",
						message: outcome.reason instanceof Error ? outcome.reason.message : "Search failed",
					};
		});
	},
};
