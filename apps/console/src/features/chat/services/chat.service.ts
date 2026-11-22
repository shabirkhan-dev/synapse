import {
	parseJsonEventStream,
	readUIMessageStream,
	uiMessageChunkSchema,
	type UIMessageChunk,
} from "ai";
import { z } from "zod";

import { api, apiStream } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { CONVERSATION_ID_HEADER } from "../constants/chat.constants";
import {
	conversationListSchema,
	conversationSchema,
	conversationWithMessagesSchema,
	replyVersionsSchema,
} from "../schemas/chat.schema";
import type {
	ChatMessage,
	Conversation,
	ReplyVersions,
	StoredConversation,
} from "../types/chat.types";

type Parsed =
	ReturnType<typeof parseJsonEventStream<UIMessageChunk>> extends ReadableStream<infer T>
		? T
		: never;

/** Server-sent events → UI message chunks; a malformed event fails the stream. */
const unwrap = () =>
	new TransformStream<Parsed, UIMessageChunk>({
		transform(parsed, controller) {
			if (parsed.success) controller.enqueue(parsed.value);
			else controller.error(parsed.error);
		},
	});

export type Reply = {
	/** Set when this message started a new stored conversation. */
	conversationId: string | null;
	/** The assistant message as it grows, one snapshot per chunk. */
	snapshots: AsyncIterable<ChatMessage>;
};

export const chatService = {
	/** Your conversations, most recently active first. */
	list: (): Promise<Conversation[]> =>
		api(endpoints.memory.conversations, { schema: conversationListSchema }),

	/** Conversations whose title contains `q`, most recently active first. */
	search: (q: string): Promise<Conversation[]> =>
		api(`${endpoints.memory.conversations}?${new URLSearchParams({ q })}`, {
			schema: conversationListSchema,
		}),

	/** A stored conversation's messages, oldest first, and the versions of its last reply. */
	async conversation(id: string): Promise<StoredConversation> {
		const conversation = await api(endpoints.memory.conversation(id), {
			schema: conversationWithMessagesSchema,
		});
		return {
			messages: conversation.messages.map((stored) => stored.message as unknown as ChatMessage),
			replyVersions: conversation.replyVersions,
		};
	},

	rename: ({ id, title }: { id: string; title: string }): Promise<Conversation> =>
		api(endpoints.memory.conversation(id), {
			method: "PATCH",
			body: { title },
			schema: conversationSchema,
		}),

	/** Put another version of the last reply in use; the next turn builds on it. */
	selectReplyVersion: ({ id, version }: { id: string; version: number }): Promise<ReplyVersions> =>
		api(endpoints.memory.replyVersion(id), {
			method: "PUT",
			body: { version },
			schema: replyVersionsSchema,
		}),

	remove: (id: string): Promise<unknown> =>
		api(endpoints.memory.conversation(id), { method: "DELETE", schema: z.unknown() }),

	/**
	 * Send one message; the API stores it, replays the conversation's history to the model and
	 * streams the reply (AI SDK UI message stream).
	 */
	send({
		message,
		conversationId,
		documentIds = [],
		signal,
	}: {
		message: ChatMessage;
		conversationId: string | null;
		/** Search only these documents this turn; empty = all of them. */
		documentIds?: string[];
		signal: AbortSignal;
	}): Promise<Reply> {
		return streamReply(
			{
				message,
				...(conversationId ? { conversationId } : {}),
				...(documentIds.length > 0 ? { documentIds } : {}),
			},
			signal,
		);
	},

	/** Answer the conversation's last question again; the API keeps the old reply as a version. */
	regenerate({
		conversationId,
		documentIds = [],
		signal,
	}: {
		conversationId: string;
		documentIds?: string[];
		signal: AbortSignal;
	}) {
		return streamReply(
			{
				conversationId,
				regenerate: true,
				...(documentIds.length > 0 ? { documentIds } : {}),
			},
			signal,
		);
	},
};

async function streamReply(body: Record<string, unknown>, signal: AbortSignal): Promise<Reply> {
	const response = await apiStream(endpoints.chat.send, { method: "POST", body, signal });
	const stream = response.body as ReadableStream<Uint8Array>;
	const chunks = parseJsonEventStream({ stream, schema: uiMessageChunkSchema }).pipeThrough(
		unwrap(),
	);
	return {
		conversationId: response.headers.get(CONVERSATION_ID_HEADER),
		snapshots: readUIMessageStream<ChatMessage>({ stream: chunks, terminateOnError: true }),
	};
}
