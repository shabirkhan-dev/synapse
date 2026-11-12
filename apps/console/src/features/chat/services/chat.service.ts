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
import { conversationListSchema, conversationWithMessagesSchema } from "../schemas/chat.schema";
import type { ChatMessage, Conversation } from "../types/chat.types";

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

	/** A stored conversation's messages, oldest first. */
	async messages(id: string): Promise<ChatMessage[]> {
		const conversation = await api(endpoints.memory.conversation(id), {
			schema: conversationWithMessagesSchema,
		});
		return conversation.messages.map((stored) => stored.message as unknown as ChatMessage);
	},

	remove: (id: string): Promise<unknown> =>
		api(endpoints.memory.conversation(id), { method: "DELETE", schema: z.unknown() }),

	/**
	 * Send one message; the API stores it, replays the conversation's history to the model and
	 * streams the reply (AI SDK UI message stream).
	 */
	async send({
		message,
		conversationId,
		signal,
	}: {
		message: ChatMessage;
		conversationId: string | null;
		signal: AbortSignal;
	}): Promise<Reply> {
		const response = await apiStream(endpoints.chat.send, {
			method: "POST",
			body: conversationId ? { message, conversationId } : { message },
			signal,
		});
		const body = response.body as ReadableStream<Uint8Array>;
		const chunks = parseJsonEventStream({ stream: body, schema: uiMessageChunkSchema }).pipeThrough(
			unwrap(),
		);
		return {
			conversationId: response.headers.get(CONVERSATION_ID_HEADER),
			snapshots: readUIMessageStream<ChatMessage>({ stream: chunks, terminateOnError: true }),
		};
	},
};
