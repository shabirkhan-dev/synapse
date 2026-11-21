import { useQueryClient } from "@tanstack/react-query";
import { generateId } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { queryKeys } from "@/lib/query/query-keys";

import { chatService } from "../services/chat.service";
import type { ChatMessage, ReplyVersions, ThreadStatus } from "../types/chat.types";

/**
 * One chat thread: sends a message, streams the reply into the message list and can stop it.
 * A failed send keeps the typed text (`status.draft`) so nothing has to be retyped.
 */
export function useChatThread({
	conversationId,
	initialMessages,
	initialVersions = ONE_VERSION,
	documentIds = [],
	onStarted,
}: {
	conversationId: string | null;
	initialMessages: ChatMessage[];
	/** Versions of the stored last reply (regenerating keeps the earlier ones). */
	initialVersions?: ReplyVersions;
	/** The documents this thread's turns search (chosen above the composer); empty = all. */
	documentIds?: string[];
	/** The API started a stored conversation for the first message. */
	onStarted: (id: string) => void;
}) {
	const queryClient = useQueryClient();
	const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
	const [status, setStatus] = useState<ThreadStatus>({ kind: "idle" });
	const [versions, setVersions] = useState<ReplyVersions>(initialVersions);
	const [switching, setSwitching] = useState(false);
	const conversation = useRef(conversationId);
	// Stored conversations can be answered again; a new one is stored once its first reply starts.
	const [stored, setStored] = useState(conversationId !== null);
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
					documentIds,
					signal: abort.signal,
				});
				if (reply.conversationId && !conversation.current) {
					conversation.current = reply.conversationId;
					setStored(true);
					onStarted(reply.conversationId);
				}
				for await (const snapshot of reply.snapshots) {
					answered = true;
					setMessages([...before, sent, snapshot]);
				}
				setVersions(ONE_VERSION);
				setStatus({ kind: "idle" });
			} catch (error) {
				if (abort.signal.aborted) {
					// The API keeps a stopped answer, so it stays on screen.
					setVersions(ONE_VERSION);
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
		[messages, documentIds, onStarted, queryClient],
	);

	/** Answer the last question again (stored conversations only); its old reply becomes a version. */
	const regenerate = useCallback(async () => {
		const id = conversation.current;
		const lastQuestion = messages.findLastIndex((message) => message.role === "user");
		if (!id || lastQuestion === -1) return;
		const kept = messages.slice(0, lastQuestion + 1);
		const abort = new AbortController();
		controller.current = abort;
		const earlier = versions.total;
		let answered = false;
		setMessages(kept);
		setStatus({ kind: "streaming" });
		try {
			const reply = await chatService.regenerate({
				conversationId: id,
				documentIds,
				signal: abort.signal,
			});
			for await (const snapshot of reply.snapshots) {
				answered = true;
				setMessages([...kept, snapshot]);
				setVersions({ current: earlier + 1, total: earlier + 1 });
			}
			setStatus({ kind: "idle" });
		} catch (error) {
			// Nothing new was written: the earlier versions are still there to go back to.
			if (!answered) setVersions({ current: 0, total: earlier });
			if (abort.signal.aborted) {
				setStatus({ kind: "idle" });
			} else {
				setStatus({
					kind: "failed",
					message: error instanceof Error ? error.message : "The answer stopped.",
					draft: "",
				});
			}
		} finally {
			controller.current = null;
		}
	}, [messages, documentIds, versions.total]);

	/** Show another version of the last reply, and make it the one the next turn builds on. */
	const selectVersion = useCallback(
		async (version: number) => {
			const id = conversation.current;
			if (!id) return;
			setSwitching(true);
			try {
				await chatService.selectReplyVersion({ id, version });
				const stored = await chatService.conversation(id);
				setMessages(stored.messages);
				setVersions(stored.replyVersions);
				if (status.kind === "failed") setStatus({ kind: "idle" });
			} catch (error) {
				setStatus({
					kind: "failed",
					message: error instanceof Error ? error.message : "That version could not be shown.",
					draft: "",
				});
			} finally {
				setSwitching(false);
			}
		},
		[status.kind],
	);

	const stop = useCallback(() => controller.current?.abort(), []);

	return {
		messages,
		status,
		send,
		regenerate,
		canRegenerate: stored,
		stop,
		versions,
		selectVersion,
		switching,
	};
}

const ONE_VERSION: ReplyVersions = { current: 1, total: 1 };
