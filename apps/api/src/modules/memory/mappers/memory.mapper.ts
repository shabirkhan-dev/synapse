import type { ChatConversationRow, ChatMessageRow, MemoryFactRow } from "@synapse/database";
import type { MemoryFact, StoredMessage } from "@synapse/memory";

export type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };

export function toConversation(row: ChatConversationRow): Conversation {
	return {
		id: row.id,
		title: row.title,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export function toStoredMessage(row: ChatMessageRow): StoredMessage<Record<string, unknown>> {
	return {
		id: row.id,
		role: row.role as StoredMessage["role"],
		message: row.message,
		createdAt: row.createdAt.toISOString(),
	};
}

export function toMemoryFact(row: Pick<MemoryFactRow, "id" | "content" | "createdAt">): MemoryFact {
	return { id: row.id, content: row.content, createdAt: row.createdAt.toISOString() };
}
