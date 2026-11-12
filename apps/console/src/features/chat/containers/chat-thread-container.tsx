"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { useEffect, useRef } from "react";

import { ChatComposer } from "../components/chat-composer";
import { ChatEmptyState } from "../components/chat-empty-state";
import { MessageList } from "../components/message-list";
import { useChatThread } from "../hooks/use-chat-thread";
import type { ChatMessage } from "../types/chat.types";

export type ChatThreadContainerProps = {
	conversationId: string | null;
	initialMessages: ChatMessage[];
	onStarted: (id: string) => void;
};

/** One conversation: the messages, the streaming answer and the composer pinned below. */
export function ChatThreadContainer({
	conversationId,
	initialMessages,
	onStarted,
}: ChatThreadContainerProps) {
	const { messages, status, send, stop } = useChatThread({
		conversationId,
		initialMessages,
		onStarted,
	});
	const streaming = status.kind === "streaming";
	const end = useRef<HTMLDivElement>(null);

	// Follow the answer as it grows, unless the reader has scrolled up to read something else.
	useEffect(() => {
		const marker = end.current;
		if (!marker || messages.length === 0) return;
		const distance = marker.getBoundingClientRect().top - window.innerHeight;
		if (distance < 160) marker.scrollIntoView({ block: "end" });
	}, [messages]);

	return (
		<div className="flex min-h-full flex-col gap-6">
			{messages.length === 0 ? (
				<ChatEmptyState onPick={send} />
			) : (
				<MessageList messages={messages} streaming={streaming} />
			)}
			{status.kind === "failed" ? (
				<Alert variant="destructive">
					<AlertTitle>Synapse could not answer</AlertTitle>
					<AlertDescription>
						{status.message}{" "}
						{status.draft
							? "Your message is back in the box below; send it again."
							: "Send your message again."}
					</AlertDescription>
				</Alert>
			) : null}
			<p role="status" className="sr-only">
				{streaming ? "Synapse is answering…" : ""}
			</p>
			<div ref={end} className="sticky bottom-0 mt-auto bg-background pt-2 pb-4">
				<ChatComposer
					streaming={streaming}
					draft={status.kind === "failed" ? status.draft : ""}
					onSend={send}
					onStop={stop}
				/>
			</div>
		</div>
	);
}
