import type { StoredMessage } from "@synapse/memory";

import type { Conversation } from "../mappers/memory.mapper";

export type { Conversation };

export type NewMessage = {
	id: string;
	role: StoredMessage["role"];
	message: Record<string, unknown>;
};

/** Versions of the last reply in creation order: `current` is 1-based (0 when none is in use). */
export type ReplyVersions = { current: number; total: number };

export interface ConversationStore {
	create(ownerId: string, title: string): Promise<Conversation>;
	find(ownerId: string, id: string): Promise<Conversation | null>;
	list(ownerId: string, limit: number): Promise<Conversation[]>;
	/** Oldest first; with `latest`, only the last that many (still oldest first). */
	messages(
		ownerId: string,
		conversationId: string,
		options?: { latest?: number },
	): Promise<Array<StoredMessage<Record<string, unknown>>>>;
	append(ownerId: string, conversationId: string, messages: NewMessage[]): Promise<void>;
	/** Keep everything after the last user message as an earlier version (it is being regenerated). */
	archiveReply(ownerId: string, conversationId: string): Promise<number>;
	replyVersions(ownerId: string, conversationId: string): Promise<ReplyVersions>;
	/** Put version `version` (1-based) of the last reply back in use; false when there is none. */
	selectReplyVersion(ownerId: string, conversationId: string, version: number): Promise<boolean>;
	rename(ownerId: string, id: string, title: string): Promise<Conversation | null>;
	remove(ownerId: string, id: string): Promise<boolean>;
	removeAll(ownerId: string): Promise<number>;
}
