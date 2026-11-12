"use client";

import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ConversationList } from "../components/conversation-list";
import { CHAT_ROUTE, CONVERSATION_PARAM } from "../constants/chat.constants";
import { useDeleteConversationMutation } from "../hooks/mutations/use-delete-conversation-mutation";
import { useConversationMessagesQuery } from "../hooks/queries/use-conversation-messages-query";
import { useConversationsQuery } from "../hooks/queries/use-conversations-query";
import { ChatThreadContainer } from "./chat-thread-container";

/**
 * The chat page. The open conversation lives in the address (`?c=<id>`), so it survives a reload
 * and can be opened in a new tab. A chat started here keeps its thread mounted when the API hands
 * back its id, so the streaming answer is not interrupted.
 */
export function ChatContainer() {
	const router = useRouter();
	const opened = useSearchParams().get(CONVERSATION_PARAM);
	const [startedHere, setStartedHere] = useState<string | null>(null);
	const [draftRound, setDraftRound] = useState(0);
	const [listOpen, setListOpen] = useState(false);
	const conversations = useConversationsQuery();
	const remove = useDeleteConversationMutation();

	// Opening another conversation forgets the one started here (it is loaded like any other).
	useEffect(() => {
		if (opened && opened !== startedHere) setStartedHere(null);
	}, [opened, startedHere]);

	const stored = opened && opened !== startedHere ? opened : null;
	const history = useConversationMessagesQuery(stored);
	const onStarted = useCallback(
		(id: string) => {
			setStartedHere(id);
			router.replace(`${CHAT_ROUTE}?${CONVERSATION_PARAM}=${encodeURIComponent(id)}`, {
				scroll: false,
			});
		},
		[router],
	);
	const title =
		conversations.data?.find((conversation) => conversation.id === opened)?.title ?? "New chat";

	return (
		<div className="grid gap-6 md:grid-cols-[15rem_minmax(0,1fr)]">
			<div className="flex flex-col gap-3">
				<Button
					type="button"
					variant="outline"
					className="justify-start gap-1.5 md:hidden"
					aria-expanded={listOpen}
					aria-controls="chat-conversations"
					onClick={() => setListOpen((open) => !open)}
				>
					<HugeiconsIcon icon={Menu01Icon} size={14} strokeWidth={1.5} aria-hidden="true" />
					{listOpen ? "Hide conversations" : "Show conversations"}
				</Button>
				<div id="chat-conversations" className={listOpen ? "" : "hidden md:block"}>
					{conversations.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Conversations could not be loaded</AlertTitle>
							<AlertDescription className="flex flex-wrap items-center gap-2">
								{conversations.error.message}
								<Button size="sm" variant="outline" onClick={() => conversations.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : (
						<ConversationList
							conversations={conversations.data ?? []}
							activeId={opened}
							deletingId={remove.isPending ? (remove.variables ?? null) : null}
							onNewChat={() => {
								setStartedHere(null);
								setDraftRound((round) => round + 1);
								setListOpen(false);
							}}
							onOpen={() => setListOpen(false)}
							onDelete={(conversation) =>
								remove.mutate(conversation.id, {
									onSuccess: () => {
										if (conversation.id === opened) {
											setStartedHere(null);
											setDraftRound((round) => round + 1);
											router.replace(CHAT_ROUTE);
										}
									},
								})
							}
						/>
					)}
				</div>
			</div>

			<section aria-labelledby="chat-title" className="flex min-w-0 flex-col gap-4">
				<h1 id="chat-title" className="text-lg font-semibold text-balance">
					{title}
				</h1>
				{remove.isError ? (
					<Alert variant="destructive">
						<AlertTitle>The conversation was not deleted</AlertTitle>
						<AlertDescription>{remove.error.message}</AlertDescription>
					</Alert>
				) : null}
				{stored && history.isPending ? (
					<p role="status" className="text-xs text-muted-foreground">
						Loading the conversation…
					</p>
				) : stored && history.isError ? (
					<Alert variant="destructive">
						<AlertTitle>This conversation could not be opened</AlertTitle>
						<AlertDescription>
							{history.error.message} Pick another one, or start a new chat.
						</AlertDescription>
					</Alert>
				) : (
					<ChatThreadContainer
						key={stored ?? `draft-${draftRound}`}
						conversationId={stored ?? startedHere}
						initialMessages={history.data ?? []}
						onStarted={onStarted}
					/>
				)}
			</section>
		</div>
	);
}
