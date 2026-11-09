import { tool } from "ai";
import { z } from "zod";

import type { GuardrailsService } from "@/modules/guardrails";
import type { MemoryService } from "@/modules/memory";
import type { RagService } from "@/modules/rag";
import type { RequestContext } from "@/shared/types/app-types";

/** Tools are built per request so RAG search is always scoped to the caller. */
export function createChatTools({
	rag,
	memory,
	guardrails,
	ownerId,
	organizationId = ownerId,
	topK,
	context = { requestId: null },
	now = () => new Date(),
}: {
	rag: RagService;
	memory: MemoryService;
	guardrails: GuardrailsService;
	/** The user (memory). */
	ownerId: string;
	/** Active organization (documents); defaults to the personal one. */
	organizationId?: string;
	topK: number;
	context?: RequestContext;
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
				const found = await rag.search(organizationId, query, requested ?? topK);
				// Tool output is untrusted: instruction-like text is removed before the model reads it.
				const matches = await guardrails.sanitizePassages(
					organizationId,
					found.map((match) => Object.assign({}, match, { id: match.chunkId })),
					"chat.search",
					context,
				);
				return matches.map((match) => ({
					documentId: match.documentId,
					title: match.documentTitle,
					source: match.source,
					score: Number(match.score.toFixed(4)),
					content: match.content,
				}));
			},
		}),
		rememberFact: tool({
			description:
				"Save a short fact about the user for future conversations. Use only when the user explicitly asks you to remember something.",
			inputSchema: z.object({
				fact: z
					.string()
					.min(1)
					.max(500)
					.describe("The fact, in the user's words, e.g. 'Prefers metric units'"),
			}),
			async execute({ fact }) {
				const saved = await memory.rememberFact(ownerId, fact, context);
				return { remembered: saved.content };
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
