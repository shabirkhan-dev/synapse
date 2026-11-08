/** A stored chat message (the UI message as the client sent or received it). */
export type StoredMessage<TMessage = unknown> = {
	id: string;
	role: "system" | "user" | "assistant";
	message: TMessage;
	createdAt: string;
};

export type HistoryBudget = {
	/** Rough token budget (~4 characters per token, like the RAG context budget). */
	maxTokens: number;
	maxMessages: number;
};

const estimateTokens = (message: unknown): number => Math.ceil(JSON.stringify(message).length / 4);

/**
 * The newest messages that fit the budget, oldest first. Always keeps the latest message, and never
 * starts with an assistant message (a reply without its question confuses the model).
 */
export function selectHistory<TMessage>(
	messages: Array<StoredMessage<TMessage>>,
	{ maxTokens, maxMessages }: HistoryBudget,
): Array<StoredMessage<TMessage>> {
	const kept: Array<StoredMessage<TMessage>> = [];
	let tokens = 0;
	for (const message of messages.toReversed()) {
		const cost = estimateTokens(message.message);
		if (kept.length > 0 && (kept.length >= maxMessages || tokens + cost > maxTokens)) {
			break;
		}
		kept.push(message);
		tokens += cost;
	}
	const ordered = kept.toReversed();
	const firstUser = ordered.findIndex((message) => message.role !== "assistant");
	return firstUser <= 0 ? ordered : ordered.slice(firstUser);
}
