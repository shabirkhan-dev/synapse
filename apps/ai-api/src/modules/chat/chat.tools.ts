import { tool } from "ai";
import { z } from "zod";

import type { RagService } from "@/modules/rag/rag.service";

/** Tools are built per request so RAG search is always scoped to the caller. */
export function createChatTools({
	rag,
	ownerId,
	topK,
	now = () => new Date(),
}: {
	rag: RagService;
	ownerId: string;
	topK: number;
	now?: () => Date;
}) {
	return {
		searchDocuments: tool({
			description:
				"Search the user's ingested documents (vector search). Use it before answering questions about their documents.",
			inputSchema: z.object({
				query: z.string().min(1).describe("What to look for, phrased as a search query"),
				topK: z.number().int().min(1).max(20).optional().describe("How many passages to return"),
			}),
			async execute({ query, topK: requested }) {
				const matches = await rag.search(ownerId, query, requested ?? topK);
				return matches.map((match) => ({
					documentId: match.documentId,
					title: match.documentTitle,
					source: match.source,
					score: Number(match.score.toFixed(4)),
					content: match.content,
				}));
			},
		}),
		currentTime: tool({
			description:
				"Get the current date and time, optionally in an IANA time zone such as Asia/Karachi.",
			inputSchema: z.object({
				timeZone: z.string().optional().describe("IANA time zone; defaults to UTC"),
			}),
			async execute({ timeZone }) {
				const date = now();
				const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
				return {
					iso: date.toISOString(),
					timeZone: zone,
					formatted: new Intl.DateTimeFormat("en-US", {
						dateStyle: "full",
						timeStyle: "long",
						timeZone: zone,
					}).format(date),
				};
			},
		}),
	};
}

export type ChatTools = ReturnType<typeof createChatTools>;

function isValidTimeZone(timeZone: string): boolean {
	try {
		return Boolean(new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions().timeZone);
	} catch {
		return false;
	}
}
