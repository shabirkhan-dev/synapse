import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { SAMPLE_DOCUMENTS } from "../constants/sample-documents";

export const onboardingService = {
	/**
	 * Add the sample documents through the normal ingest path (dedup, chunking, embedding, audit),
	 * one at a time; adding them again returns the stored ones.
	 */
	async addSampleDocuments(): Promise<number> {
		for (const document of SAMPLE_DOCUMENTS) {
			// oxlint-disable-next-line no-await-in-loop -- one at a time, in order
			await api(endpoints.documents.ingest, {
				method: "POST",
				body: { title: document.title, content: document.content },
				schema: z.object({ id: z.string() }),
			});
		}
		return SAMPLE_DOCUMENTS.length;
	},
};
