import { getToolName, isTextUIPart, isToolUIPart } from "ai";

import type { CitedPassage } from "@/components/shared/citation-popover";

import { searchResultsSchema } from "../schemas/chat.schema";
import type { ChatMessage } from "../types/chat.types";

/** The passages a reply's searches returned, by citation number (`[n]` in its text). */
export function passagesOf(
	message: ChatMessage,
): Map<number, CitedPassage & { documentId: string }> {
	const passages = new Map<number, CitedPassage & { documentId: string }>();
	for (const part of message.parts) {
		if (!isToolUIPart(part) || getToolName(part) !== "searchDocuments") continue;
		if (part.state !== "output-available") continue;
		const parsed = searchResultsSchema.safeParse(part.output);
		if (!parsed.success) continue;
		for (const result of parsed.data) {
			if (result.citation === undefined) continue;
			passages.set(result.citation, {
				citation: result.citation,
				documentId: result.documentId,
				title: result.title,
				source: result.source,
				content: result.content,
			});
		}
	}
	return passages;
}

/** Citation numbers the reply's text uses, in order of first use, among those that exist. */
export function citedIn(message: ChatMessage, known: ReadonlyMap<number, unknown>): number[] {
	const text = message.parts
		.filter(isTextUIPart)
		.map((part) => part.text)
		.join(" ");
	const used = [...text.matchAll(/\[(\d{1,3})\]/g)].map((match) => Number(match[1]));
	return [...new Set(used)].filter((citation) => known.has(citation));
}
