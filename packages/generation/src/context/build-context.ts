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

/** Rough token estimate (~4 characters per token): the default when no tokenizer is supplied. */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

/** Counts tokens in a text, e.g. the Rust tokenizer from `@synapse/native` (wired by the app). */
export type CountTokens = (text: string) => number;

/**
 * Number passages `[1]…[n]` in rank order until `maxTokens` is used. The first passage is always
 * included (truncated if it alone exceeds the budget) so the model never gets an empty context.
 */
export function buildContext(
	passages: ContextPassage[],
	{ maxTokens, countTokens = estimateTokens }: { maxTokens: number; countTokens?: CountTokens },
): BuiltContext {
	const blocks: string[] = [];
	const citations: Citation[] = [];
	let used = 0;

	for (const passage of passages) {
		const index = citations.length + 1;
		const header = `[${index}] ${passage.title}${passage.source ? ` (${passage.source})` : ""}\n`;
		let block = header + passage.content;
		const cost = countTokens(block);
		if (used + cost > maxTokens) {
			if (citations.length > 0) {
				break;
			}
			block = truncateToTokens(block, maxTokens, countTokens);
		}
		blocks.push(block);
		used += countTokens(block);
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

/**
 * Cut `text` to about `maxTokens`: first at ~4 characters per token, then — when a real tokenizer
 * counts more (e.g. CJK text) — shrink in proportion until it fits.
 */
function truncateToTokens(text: string, maxTokens: number, countTokens: CountTokens): string {
	let cut = text.slice(0, maxTokens * 4);
	for (
		let tokens = countTokens(cut);
		tokens > maxTokens && cut.length > 0;
		tokens = countTokens(cut)
	) {
		cut = cut.slice(0, Math.floor((cut.length * maxTokens) / tokens) - 1);
	}
	return cut;
}
