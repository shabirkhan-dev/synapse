import { useQueryClient } from "@tanstack/react-query";
import { generateId } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../services/chat.service";
import type { ChatMessage, ThreadStatus } from "../types/chat.types";

/**
 * One chat thread: sends a message, streams the reply into the message list and can stop it.
 * A failed send keeps the typed text (`status.draft`) so nothing has to be retyped.
 */
export function useChatThread({
	conversationId,
	initialMessages,
	onStarted,
}: {
	conversationId: string | null;
	initialMessages: ChatMessage[];
	/** The API started a stored conversation for the first message. */
	onStarted: (id: string) => void;
}) {
	const queryClient = useQueryClient();
	const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
	const [status, setStatus] = useState<ThreadStatus>({ kind: "idle" });
	const conversation = useRef(conversationId);
	const controller = useRef<AbortController | null>(null);

	useEffect(() => () => controller.current?.abort(), []);

	const send = useCallback(
		async (text: string) => {
			const sent: ChatMessage = { id: generateId(), role: "user", parts: [{ type: "text", text }] };
			const before = messages;
			const abort = new AbortController();
			controller.current = abort;
			setMessages([...before, sent]);
			setStatus({ kind: "streaming" });
			let answered = false;
			try {
				const reply = await chatService.send({
					message: sent,
					conversationId: conversation.current,
					signal: abort.signal,
				});
				if (reply.conversationId && !conversation.current) {
					conversation.current = reply.conversationId;
					onStarted(reply.conversationId);
				}
				for await (const snapshot of reply.snapshots) {
					answered = true;
					setMessages([...before, sent, snapshot]);
				}
				setStatus({ kind: "idle" });
			} catch (error) {
				if (abort.signal.aborted) {
					setStatus({ kind: "idle" });
				} else {
					// Refused before anything streamed: the message was not kept, so take it back.
					if (!answered) setMessages(before);
					setStatus({
						kind: "failed",
						message: error instanceof Error ? error.message : "The answer stopped.",
						draft: answered ? "" : text,
					});
				}
			} finally {
				controller.current = null;
				void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
			}
		},
		[messages, onStarted, queryClient],
	);

	const stop = useCallback(() => controller.current?.abort(), []);

	return { messages, status, send, stop };
}
