import { tool } from "ai";
import { z } from "zod";

import type { GuardrailsService } from "@/modules/guardrails";
import type { MemoryService } from "@/modules/memory";
import type { RagReader, RagService } from "@/modules/rag";
import type { RequestContext } from "@/shared/types/app-types";

import { CHAT_TOOLS } from "../constants/chat.constants";

/** Tools are built per request so RAG search is always scoped to the caller. */
export function createChatTools({
	rag,
	memory,
	guardrails,
	ownerId,
	organizationId = ownerId,
	reader = { ownerId: organizationId, userId: ownerId, readsAll: false },
	topK,
	documentIds,
	context = { requestId: null },
	now = () => new Date(),
	onRedacted = () => {},
}: {
	rag: RagService;
	memory: MemoryService;
	guardrails: GuardrailsService;
	/** The user (memory). */
	ownerId: string;
	/** Active organization (documents); defaults to the personal one. */
	organizationId?: string;
	/** Who searches (ADR-0008); defaults to the user without `documents.read_all`. */
	reader?: RagReader;
	topK: number;
	/** The turn is narrowed to these documents: every search reads only them. */
	documentIds?: readonly string[];
	context?: RequestContext;
	now?: () => Date;
	/** Called each time a secret was removed from a tool result (the caller audits once). */
	onRedacted?: () => void;
}) {
	// Citation numbers run across every search in one reply, so `[n]` names one passage.
	let nextCitation = 1;
	// Tool results reach the model, the browser and the stored reply: secrets go first.
	const clean = <T extends string | null>(text: T): T => {
		if (text === null) return text;
		const checked = guardrails.redactSecrets(text);
		if (checked.redacted) onRedacted();
		return checked.text as T;
	};
	return {
		searchDocuments: tool({
			description: CHAT_TOOLS.searchDocuments.description,
			inputSchema: z.object({
				query: z.string().min(1).describe("What to look for, phrased as a search query"),
				topK: z.number().int().min(1).max(20).optional().describe("How many passages to return"),
			}),
			async execute({ query, topK: requested }) {
				const found = await rag.search(reader, query, requested ?? topK, undefined, documentIds);
				// Tool output is untrusted: instruction-like text is removed before the model reads it.
				const matches = await guardrails.sanitizePassages(
					organizationId,
					found.map((match) => Object.assign({}, match, { id: match.chunkId })),
					"chat.search",
					context,
				);
				return matches.map((match) => ({
					citation: nextCitation++,
					documentId: match.documentId,
					title: match.documentTitle,
					/** `Title › headings` the passage sits under (null before chunker text-v2). */
					context: clean(match.context),
					source: match.source,
					score: Number(match.score.toFixed(4)),
					content: clean(match.content),
				}));
			},
		}),
		rememberFact: tool({
			description: CHAT_TOOLS.rememberFact.description,
			inputSchema: z.object({
				fact: z
					.string()
					.min(1)
					.max(500)
					.describe("The fact, in the user's words, e.g. 'Prefers metric units'"),
			}),
			async execute({ fact }) {
				const saved = await memory.rememberFact(ownerId, fact, context);
				return { remembered: clean(saved.content) };
			},
		}),
		currentTime: tool({
			description: CHAT_TOOLS.currentTime.description,
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
