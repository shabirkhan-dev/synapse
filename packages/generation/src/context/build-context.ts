/** A retrieved passage to show the model. */
export type ContextPassage = {
	chunkId: string;
	documentId: string;
	title: string;
	source: string | null;
	content: string;
};

/** What `[n]` in the context (and in the answer) refers to. */
export type Citation = {
	index: number;
	chunkId: string;
	documentId: string;
	title: string;
	source: string | null;
};

export type BuiltContext = {
	text: string;
	citations: Citation[];
	/** Passages left out because the budget ran out. */
	omitted: number;
};

/** Rough token estimate (~4 characters per token); good enough for budgeting without a tokenizer. */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Number passages `[1]…[n]` in rank order until `maxTokens` is used. The first passage is always
 * included (truncated if it alone exceeds the budget) so the model never gets an empty context.
 */
export function buildContext(
	passages: ContextPassage[],
	{ maxTokens }: { maxTokens: number },
): BuiltContext {
	const blocks: string[] = [];
	const citations: Citation[] = [];
	let used = 0;

	for (const passage of passages) {
		const index = citations.length + 1;
		const header = `[${index}] ${passage.title}${passage.source ? ` (${passage.source})` : ""}\n`;
		let block = header + passage.content;
		const cost = estimateTokens(block);
		if (used + cost > maxTokens) {
			if (citations.length > 0) {
				break;
			}
			block = block.slice(0, maxTokens * 4);
		}
		blocks.push(block);
		used += estimateTokens(block);
		citations.push({
			index,
			chunkId: passage.chunkId,
			documentId: passage.documentId,
			title: passage.title,
			source: passage.source,
		});
	}

	return { text: blocks.join("\n\n"), citations, omitted: passages.length - citations.length };
}
