import { and, asc, desc, eq, gt, isNull, type SQL, sql } from "drizzle-orm";

import { chatConversations, chatMessages, type Database } from "@synapse/database";
import type { StoredMessage } from "@synapse/memory";

import { toConversation, toStoredMessage } from "../mappers/memory.mapper";
import type {
	Conversation,
	ConversationStore,
	NewMessage,
	ReplyVersions,
} from "../types/memory.types";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class DrizzleConversationRepository implements ConversationStore {
	constructor(private readonly db: Database) {}

	async create(ownerId: string, title: string): Promise<Conversation> {
		const [row] = await this.db.insert(chatConversations).values({ ownerId, title }).returning();
		if (!row) {
			throw new Error("Failed to insert conversation");
		}
		return toConversation(row);
	}

	async find(ownerId: string, id: string): Promise<Conversation | null> {
		const [row] = await this.db
			.select()
			.from(chatConversations)
			.where(and(eq(chatConversations.id, id), eq(chatConversations.ownerId, ownerId)))
			.limit(1);
		return row ? toConversation(row) : null;
	}

	async list(ownerId: string, limit: number): Promise<Conversation[]> {
		const rows = await this.db
			.select()
			.from(chatConversations)
			.where(eq(chatConversations.ownerId, ownerId))
			.orderBy(desc(chatConversations.updatedAt))
			.limit(limit);
		return rows.map(toConversation);
	}

	/** Oldest first. The conversation must already be known to belong to `ownerId`. */
	async messages(
		ownerId: string,
		conversationId: string,
		{ latest }: { latest?: number } = {},
	): Promise<Array<StoredMessage<Record<string, unknown>>>> {
		const query = this.db
			.select()
			.from(chatMessages)
			.where(and(messagesOf(ownerId, conversationId), isNull(chatMessages.archivedVersion)))
			// Insertion order: messages stored in one insert share `created_at`.
			.orderBy(latest === undefined ? asc(chatMessages.ordinal) : desc(chatMessages.ordinal));
		const rows = latest === undefined ? await query : (await query.limit(latest)).toReversed();
		return rows.map(toStoredMessage);
	}

	/**
	 * Append messages in order; ids already stored are skipped (a client may resend history).
	 * Timestamps are spaced by 1 ms so messages written together keep their order.
	 */
	async append(ownerId: string, conversationId: string, messages: NewMessage[]): Promise<void> {
		if (messages.length === 0) {
			return;
		}
		const base = Date.now();
		await this.db.transaction(async (tx) => {
			await tx
				.insert(chatMessages)
				.values(
					messages.map((message, index) => ({
						...message,
						conversationId,
						ownerId,
						createdAt: new Date(base + index),
					})),
				)
				.onConflictDoNothing({ target: [chatMessages.conversationId, chatMessages.id] });
			await tx
				.update(chatConversations)
				.set({ updatedAt: sql`now()` })
				.where(
					and(eq(chatConversations.id, conversationId), eq(chatConversations.ownerId, ownerId)),
				);
		});
	}

	async archiveReply(ownerId: string, conversationId: string): Promise<number> {
		// One id for the whole reply, so its messages stay one version.
		const rows = await this.db
			.update(chatMessages)
			.set({ archivedVersion: crypto.randomUUID() })
			.where(
				and(afterLastUserMessage(ownerId, conversationId), isNull(chatMessages.archivedVersion)),
			)
			.returning({ id: chatMessages.id });
		return rows.length;
	}

	async replyVersions(ownerId: string, conversationId: string): Promise<ReplyVersions> {
		const versions = await replyVersionsOf(this.db, ownerId, conversationId);
		return {
			current: versions.findIndex((version) => version.key === null) + 1,
			total: versions.length,
		};
	}

	async selectReplyVersion(
		ownerId: string,
		conversationId: string,
		version: number,
	): Promise<boolean> {
		return this.db.transaction(async (tx) => {
			// Two switches at once must not leave two versions in use.
			await tx
				.select({ id: chatConversations.id })
				.from(chatConversations)
				.where(
					and(eq(chatConversations.id, conversationId), eq(chatConversations.ownerId, ownerId)),
				)
				.for("update");
			const target = (await replyVersionsOf(tx, ownerId, conversationId))[version - 1];
			if (!target) return false;
			if (target.key === null) return true;
			await tx
				.update(chatMessages)
				.set({ archivedVersion: crypto.randomUUID() })
				.where(
					and(afterLastUserMessage(ownerId, conversationId), isNull(chatMessages.archivedVersion)),
				);
			await tx
				.update(chatMessages)
				.set({ archivedVersion: null })
				.where(
					and(messagesOf(ownerId, conversationId), eq(chatMessages.archivedVersion, target.key)),
				);
			return true;
		});
	}

	async rename(ownerId: string, id: string, title: string): Promise<Conversation | null> {
		const [row] = await this.db
			.update(chatConversations)
			.set({ title })
			.where(and(eq(chatConversations.id, id), eq(chatConversations.ownerId, ownerId)))
			.returning();
		return row ? toConversation(row) : null;
	}

	async remove(ownerId: string, id: string): Promise<boolean> {
		const rows = await this.db
			.delete(chatConversations)
			.where(and(eq(chatConversations.id, id), eq(chatConversations.ownerId, ownerId)))
			.returning({ id: chatConversations.id });
		return rows.length > 0;
	}

	async removeAll(ownerId: string): Promise<number> {
		const rows = await this.db
			.delete(chatConversations)
			.where(eq(chatConversations.ownerId, ownerId))
			.returning({ id: chatConversations.id });
		return rows.length;
	}
}

const messagesOf = (ownerId: string, conversationId: string): SQL | undefined =>
	and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.ownerId, ownerId));

/** The last reply: every message after the last user message (user messages are never archived). */
function afterLastUserMessage(ownerId: string, conversationId: string): SQL | undefined {
	const scope = messagesOf(ownerId, conversationId);
	return and(
		scope,
		gt(
			chatMessages.ordinal,
			sql`(select max(${chatMessages.ordinal}) from ${chatMessages} where ${and(scope, eq(chatMessages.role, "user"))})`,
		),
	);
}

/** The last reply's versions in the order they were written; `key` null is the one in use. */
function replyVersionsOf(db: Database | Tx, ownerId: string, conversationId: string) {
	return db
		.select({ key: chatMessages.archivedVersion })
		.from(chatMessages)
		.where(afterLastUserMessage(ownerId, conversationId))
		.groupBy(chatMessages.archivedVersion)
		.orderBy(sql`min(${chatMessages.ordinal})`);
}
