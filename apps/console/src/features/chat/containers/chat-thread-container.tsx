"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { useEffect, useRef, useState } from "react";

import { DocumentScope } from "@/components/shared/document-scope";
import { useDocumentsQuery } from "@/features/documents";

import { FollowUpsContainer } from "@/features/follow-ups";

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
	// Which documents this conversation's turns search; kept while the page is open.
	const [scope, setScope] = useState<string[]>([]);
	const documents = useDocumentsQuery();
	const { messages, status, send, regenerate, canRegenerate, stop } = useChatThread({
		conversationId,
		initialMessages,
		documentIds: scope,
		onStarted,
	});
	const streaming = status.kind === "streaming";
	const last = messages.at(-1);
	const question = messages.findLast((message) => message.role === "user");
	// Follow-ups once a reply has fully arrived (not while it streams, not after a failure).
	const answered =
		!streaming && status.kind !== "failed" && last?.role === "assistant" && question
			? { question: textOf(question), answer: textOf(last) }
			: null;
	const end = useRef<HTMLDivElement>(null);

	// Follow the answer as it grows, unless the reader has scrolled up to read something else.
	useEffect(() => {
		const marker = end.current;
		if (!marker || messages.length === 0) return;
		const distance = marker.getBoundingClientRect().top - window.innerHeight;
		if (distance < 160) marker.scrollIntoView({ block: "end" });
	}, [messages]);

	return (
		<div className="flex flex-1 flex-col gap-6">
			<DocumentScope documents={documents.data ?? []} selected={scope} onChange={setScope} />
			{messages.length === 0 ? (
				<ChatEmptyState onPick={send} />
			) : (
				<MessageList
					messages={messages}
					streaming={streaming}
					{...(canRegenerate ? { onRegenerate: () => void regenerate() } : {})}
				/>
			)}
			{answered && answered.answer ? (
				<FollowUpsContainer answered={answered} onPick={(next) => void send(next)} />
			) : null}
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
			<div
				ref={end}
				className="sticky bottom-0 mt-auto bg-linear-to-t from-background from-60% to-transparent pt-6 pb-4"
			>
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

function textOf(message: ChatMessage): string {
	return message.parts
		.flatMap((part) => (part.type === "text" ? [part.text] : []))
		.join("")
		.trim();
}
