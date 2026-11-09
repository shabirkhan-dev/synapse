import { type ActionInput, OVERSIGHT_ACTIONS, type OversightService } from "@/modules/oversight";

import { RAG_DEFAULT_LIST_LIMIT, RAG_MESSAGES } from "../constants/rag.constants";
import type { RagService } from "./rag.service";

/** RAG actions that need an approval before they run. */
export function registerRagActions(oversight: OversightService, rag: RagService): void {
	oversight.registerAction<ActionInput, { deleted: number }>(OVERSIGHT_ACTIONS.PURGE_DOCUMENTS, {
		describe: async ({ ownerId }) => {
			const documents = await rag.listDocuments(ownerId, RAG_DEFAULT_LIST_LIMIT + 1);
			return RAG_MESSAGES.PURGE_SUMMARY(documents.length, RAG_DEFAULT_LIST_LIMIT);
		},
		execute: ({ ownerId, requestedBy }) => rag.purgeDocuments(ownerId, requestedBy),
	});
}
