"use client";

import { ArrowDown02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import { useEffect, useRef, useState } from "react";

import { DocumentScopeMenu } from "@/components/shared/document-scope";
import { useDocumentsQuery } from "@/features/documents";

import { FollowUpsContainer } from "@/features/follow-ups";

import { ChatComposer } from "../components/chat-composer";
import { ChatEmptyState } from "../components/chat-empty-state";
import { MessageList } from "../components/message-list";
import { ReplyVersions } from "../components/reply-versions";
import { useChatThread } from "../hooks/use-chat-thread";
import type { ChatMessage, ReplyVersions as Versions } from "../types/chat.types";

export type ChatThreadContainerProps = {
	conversationId: string | null;
	initialMessages: ChatMessage[];
	initialVersions?: Versions;
	onStarted: (id: string) => void;
};

/** One conversation: the messages, the streaming answer and the composer pinned below. */
export function ChatThreadContainer({
	conversationId,
	initialMessages,
	initialVersions,
	onStarted,
}: ChatThreadContainerProps) {
	// Which documents this conversation's turns search; kept while the page is open.
	const [scope, setScope] = useState<string[]>([]);
	const documents = useDocumentsQuery();
	const {
		messages,
		status,
		send,
		regenerate,
		canRegenerate,
		stop,
		versions,
		selectVersion,
		switching,
	} = useChatThread({
		conversationId,
		initialMessages,
		...(initialVersions ? { initialVersions } : {}),
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
	// Earlier replies to step through; with none in use (regenerate failed) it shows on its own.
	const switcher =
		versions.total > 1 || (versions.current === 0 && versions.total > 0) ? (
			<ReplyVersions
				versions={versions}
				disabled={switching || streaming}
				onSelect={(version) => void selectVersion(version)}
			/>
		) : null;

	// Follow the answer as it grows, unless the reader has scrolled up to read something else.
	useEffect(() => {
		const marker = end.current;
		if (!marker || messages.length === 0) return;
		const distance = marker.getBoundingClientRect().top - window.innerHeight;
		if (distance < 160) marker.scrollIntoView({ block: "end" });
	}, [messages]);

	// Scrolled up while the thread goes on below: offer a way back to the latest message.
	const [awayFromEnd, setAwayFromEnd] = useState(false);
	useEffect(() => {
		function measure() {
			const marker = end.current;
			if (!marker) return;
			setAwayFromEnd(marker.getBoundingClientRect().top - window.innerHeight > 240);
		}
		measure();
		window.addEventListener("scroll", measure, { passive: true });
		window.addEventListener("resize", measure);
		return () => {
			window.removeEventListener("scroll", measure);
			window.removeEventListener("resize", measure);
		};
	}, [messages.length]);

	const composer = (
		<ChatComposer
			streaming={streaming}
			draft={status.kind === "failed" ? status.draft : ""}
			onSend={send}
			onStop={stop}
			autoFocus={messages.length === 0}
			toolbar={
				<DocumentScopeMenu documents={documents.data ?? []} selected={scope} onChange={setScope} />
			}
		/>
	);

	const failure =
		status.kind === "failed" ? (
			<Alert variant="destructive">
				<AlertTitle>Synapse could not answer</AlertTitle>
				<AlertDescription>
					{status.message}{" "}
					{status.draft
						? "Your message is back in the box below; send it again."
						: "Send your message again."}
				</AlertDescription>
			</Alert>
		) : null;

	if (messages.length === 0) {
		// A new chat: the greeting and the box together, in the middle of the page.
		return (
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 py-6">
				<ChatEmptyState onPick={send} />
				{failure}
				{composer}
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6">
			<MessageList
				messages={messages}
				streaming={streaming}
				{...(canRegenerate ? { onRegenerate: () => void regenerate() } : {})}
				lastReplyActions={last?.role === "assistant" ? switcher : null}
			/>
			{last?.role !== "assistant" && !streaming && switcher ? (
				<div className="-ms-3 flex items-center gap-2 text-sm text-muted-foreground">
					{switcher}
					Show an earlier reply
				</div>
			) : null}
			{answered && answered.answer ? (
				<FollowUpsContainer answered={answered} onPick={(next) => void send(next)} />
			) : null}
			{failure}
			<p role="status" className="sr-only">
				{streaming ? "Synapse is answering…" : ""}
			</p>
			<div
				ref={end}
				className="sticky bottom-0 mt-auto bg-linear-to-t from-background from-70% to-transparent pt-8 pb-4"
			>
				{awayFromEnd ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full shadow-pop"
						onClick={() => end.current?.scrollIntoView({ block: "end" })}
					>
						<HugeiconsIcon icon={ArrowDown02Icon} strokeWidth={1.75} aria-hidden="true" />
						Jump to latest
					</Button>
				) : null}
				{composer}
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
