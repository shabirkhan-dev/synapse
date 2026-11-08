import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import {
	formatRecalledFacts,
	type HistoryBudget,
	type LongTermMemory,
	type MemoryFact,
	selectHistory,
	type StoredMessage,
} from "@synapse/memory";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/types/app-types";

import {
	CONVERSATION_TITLE_LENGTH,
	MEMORY_ERROR_CODES,
	MEMORY_LIST_LIMIT,
	MEMORY_MESSAGES,
} from "../constants/memory.constants";
import type { Conversation, ConversationStore, NewMessage } from "../types/memory.types";

/** A UI message as the chat route receives it (validated by the chat service). */
export type ChatMessage = NewMessage;

export type MemoryServiceOptions = {
	conversations: ConversationStore;
	facts: LongTermMemory;
	audit: AuditLog;
	history: HistoryBudget;
};

const NO_REQUEST: RequestContext = { requestId: null };

/**
 * Conversation history (stored per owner, replayed within a budget) and long-term facts the user
 * asked to remember. Every read and write is scoped to the owner.
 */
export class MemoryService {
	constructor(private readonly options: MemoryServiceOptions) {}

	/**
	 * Store the new user message (creating the conversation when no id is given) and return the
	 * history to send to the model: stored messages within the budget, the new one last.
	 */
	async continueConversation(
		ownerId: string,
		conversationId: string | undefined,
		message: ChatMessage,
	): Promise<{ conversationId: string; history: Array<Record<string, unknown>> }> {
		const conversation = conversationId
			? await this.conversation(ownerId, conversationId)
			: await this.options.conversations.create(ownerId, titleOf(message));
		await this.options.conversations.append(ownerId, conversation.id, [message]);
		const stored = await this.options.conversations.messages(ownerId, conversation.id);
		return {
			conversationId: conversation.id,
			history: selectHistory(stored, this.options.history).map((entry) => entry.message),
		};
	}

	/** Store the messages of a finished reply (ids already stored are skipped). */
	saveMessages(ownerId: string, conversationId: string, messages: ChatMessage[]): Promise<void> {
		return this.options.conversations.append(ownerId, conversationId, messages);
	}

	listConversations(ownerId: string): Promise<Conversation[]> {
		return this.options.conversations.list(ownerId, MEMORY_LIST_LIMIT);
	}

	async getConversation(
		ownerId: string,
		id: string,
	): Promise<Conversation & { messages: Array<StoredMessage<Record<string, unknown>>> }> {
		const conversation = await this.conversation(ownerId, id);
		return { ...conversation, messages: await this.options.conversations.messages(ownerId, id) };
	}

	async deleteConversation(ownerId: string, id: string, context = NO_REQUEST): Promise<void> {
		if (!(await this.options.conversations.remove(ownerId, id))) {
			throw notFound(
				MEMORY_ERROR_CODES.CONVERSATION_NOT_FOUND,
				MEMORY_MESSAGES.CONVERSATION_NOT_FOUND,
			);
		}
		await this.record(
			ownerId,
			AUDIT_ACTIONS.MEMORY_CONVERSATION_DELETED,
			"conversation",
			id,
			context,
			{},
		);
	}

	/** System-prompt block of facts relevant to `query` ("" when none). */
	async recallContext(ownerId: string, query: string): Promise<string> {
		return formatRecalledFacts(await this.options.facts.recall(ownerId, query));
	}

	listFacts(ownerId: string): Promise<MemoryFact[]> {
		return this.options.facts.list(ownerId, MEMORY_LIST_LIMIT);
	}

	async rememberFact(ownerId: string, content: string, context = NO_REQUEST): Promise<MemoryFact> {
		const fact = await this.options.facts.remember(ownerId, content);
		await this.record(ownerId, AUDIT_ACTIONS.MEMORY_FACT_SAVED, "memory_fact", fact.id, context, {
			content: fact.content,
		});
		return fact;
	}

	async forgetFact(ownerId: string, id: string, context = NO_REQUEST): Promise<void> {
		if (!(await this.options.facts.forget(ownerId, id))) {
			throw notFound(MEMORY_ERROR_CODES.FACT_NOT_FOUND, MEMORY_MESSAGES.FACT_NOT_FOUND);
		}
		await this.record(ownerId, AUDIT_ACTIONS.MEMORY_FACT_FORGOTTEN, "memory_fact", id, context, {});
	}

	/** Delete every conversation and remembered fact of the owner. */
	async forgetEverything(
		ownerId: string,
		context = NO_REQUEST,
	): Promise<{ conversations: number; facts: number }> {
		const conversations = await this.options.conversations.removeAll(ownerId);
		const facts = await this.options.facts.forgetAll(ownerId);
		await this.record(ownerId, AUDIT_ACTIONS.MEMORY_ALL_FORGOTTEN, "memory", null, context, {
			conversations,
			facts,
		});
		return { conversations, facts };
	}

	private async conversation(ownerId: string, id: string): Promise<Conversation> {
		const conversation = await this.options.conversations.find(ownerId, id);
		if (!conversation) {
			throw notFound(
				MEMORY_ERROR_CODES.CONVERSATION_NOT_FOUND,
				MEMORY_MESSAGES.CONVERSATION_NOT_FOUND,
			);
		}
		return conversation;
	}

	private async record(
		ownerId: string,
		action: string,
		subjectType: string,
		subjectId: string | null,
		context: RequestContext,
		data: Record<string, unknown>,
	): Promise<void> {
		await this.options.audit.record({
			ownerId,
			actorId: ownerId,
			action,
			subjectType,
			subjectId,
			requestId: context.requestId,
			data,
			provenance: null,
		});
	}
}

function titleOf(message: ChatMessage): string {
	const parts = Array.isArray(message.message.parts) ? message.message.parts : [];
	const text = parts
		.map((part: unknown) =>
			part && typeof part === "object" && "text" in part && typeof part.text === "string"
				? part.text
				: "",
		)
		.join(" ")
		.trim();
	return text.slice(0, CONVERSATION_TITLE_LENGTH) || "New conversation";
}

function notFound(code: string, message: string): AppError {
	return new AppError({ statusCode: HTTP_STATUS.NOT_FOUND, code, message });
}
