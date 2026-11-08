import type { StoredMessage } from "@synapse/memory";

import type { Conversation } from "../mappers/memory.mapper";

export type { Conversation };

export type NewMessage = {
	id: string;
	role: StoredMessage["role"];
	message: Record<string, unknown>;
};

export interface ConversationStore {
	create(ownerId: string, title: string): Promise<Conversation>;
	find(ownerId: string, id: string): Promise<Conversation | null>;
	list(ownerId: string, limit: number): Promise<Conversation[]>;
	messages(
		ownerId: string,
		conversationId: string,
	): Promise<Array<StoredMessage<Record<string, unknown>>>>;
	append(ownerId: string, conversationId: string, messages: NewMessage[]): Promise<void>;
	remove(ownerId: string, id: string): Promise<boolean>;
	removeAll(ownerId: string): Promise<number>;
}
