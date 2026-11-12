"use client";

import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@synapse/ui/components/alert-dialog";
import { Button, buttonVariants } from "@synapse/ui/components/button";
import Link from "next/link";
import { useState } from "react";

import { CHAT_ROUTE, CONVERSATION_PARAM } from "../constants/chat.constants";
import type { Conversation } from "../types/chat.types";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export type ConversationListProps = {
	conversations: Conversation[];
	activeId: string | null;
	deletingId: string | null;
	onNewChat: () => void;
	/** A conversation link was followed (phones close the list then). */
	onOpen: () => void;
	onDelete: (conversation: Conversation) => void;
};

/** Stored conversations, most recent first, each a real link; deleting asks first. */
export function ConversationList({
	conversations,
	activeId,
	deletingId,
	onNewChat,
	onOpen,
	onDelete,
}: ConversationListProps) {
	const [confirming, setConfirming] = useState<Conversation | null>(null);

	return (
		<nav aria-label="Conversations" className="flex flex-col gap-3">
			<Link
				href={CHAT_ROUTE}
				onClick={onNewChat}
				className={buttonVariants({ variant: "outline", className: "justify-start gap-1.5" })}
			>
				<HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={1.5} aria-hidden="true" />
				New chat
			</Link>
			{conversations.length === 0 ? (
				<p className="px-2 text-xs text-muted-foreground">Your conversations appear here.</p>
			) : (
				<ul className="flex flex-col gap-0.5">
					{conversations.map((conversation) => {
						const active = conversation.id === activeId;
						return (
							<li key={conversation.id} className="group relative flex items-center">
								<Link
									href={`${CHAT_ROUTE}?${CONVERSATION_PARAM}=${encodeURIComponent(conversation.id)}`}
									aria-current={active ? "page" : undefined}
									onClick={onOpen}
									title={conversation.title}
									className={`flex min-w-0 flex-1 flex-col rounded-md py-1.5 ps-2 pe-9 text-sm hover:bg-muted ${active ? "bg-muted font-medium" : ""}`}
								>
									<span className="truncate">{conversation.title}</span>
									<span className="text-xs font-normal text-muted-foreground">
										<time dateTime={conversation.updatedAt}>
											{dateFormat.format(new Date(conversation.updatedAt))}
										</time>
									</span>
								</Link>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute end-1 text-muted-foreground"
									disabled={deletingId === conversation.id}
									aria-label={`Delete conversation “${conversation.title}”`}
									onClick={() => setConfirming(conversation)}
								>
									<HugeiconsIcon
										icon={Delete02Icon}
										size={14}
										strokeWidth={1.5}
										aria-hidden="true"
									/>
								</Button>
							</li>
						);
					})}
				</ul>
			)}
			<AlertDialog
				open={confirming !== null}
				onOpenChange={(open) => {
					if (!open) setConfirming(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{confirming?.title}”?</AlertDialogTitle>
						<AlertDialogDescription>
							The conversation and its messages are deleted. This cannot be undone. Facts Synapse
							remembers about you are kept.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								if (confirming) onDelete(confirming);
								setConfirming(null);
							}}
						>
							Delete conversation
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</nav>
	);
}
