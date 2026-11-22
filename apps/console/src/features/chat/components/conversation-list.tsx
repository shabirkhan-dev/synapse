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
import { Input } from "@synapse/ui/components/input";
import { cn } from "@synapse/ui/lib/utils";
import Link from "next/link";
import { useState } from "react";

import { CHAT_ROUTE, CONVERSATION_PARAM } from "../constants/chat.constants";
import type { Conversation } from "../types/chat.types";
import { groupConversations } from "../utils/group-conversations";

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

/**
 * Stored conversations by last activity (Today, Yesterday, Previous 7 days, Older), each a real
 * link; a filter narrows them by title; deleting asks first.
 */
export function ConversationList({
	conversations,
	activeId,
	deletingId,
	onNewChat,
	onOpen,
	onDelete,
}: ConversationListProps) {
	const [confirming, setConfirming] = useState<Conversation | null>(null);
	const [filter, setFilter] = useState("");
	const needle = filter.trim().toLowerCase();
	const groups = groupConversations(
		needle
			? conversations.filter((conversation) => conversation.title.toLowerCase().includes(needle))
			: conversations,
	);

	return (
		<nav aria-label="Conversations" className="flex flex-col gap-3">
			<Link
				href={CHAT_ROUTE}
				onClick={onNewChat}
				className={buttonVariants({ variant: "outline", className: "justify-start" })}
			>
				<HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.75} aria-hidden="true" />
				New chat
			</Link>
			{conversations.length > 0 ? (
				<Input
					type="search"
					value={filter}
					onChange={(event) => setFilter(event.target.value)}
					placeholder="Filter conversations"
					aria-label="Filter conversations"
					className="h-8 text-[0.8125rem]"
				/>
			) : null}
			{conversations.length === 0 ? (
				<p className="px-2 text-xs text-muted-foreground">Your conversations appear here.</p>
			) : groups.length === 0 ? (
				<p className="px-2 text-xs text-muted-foreground">No conversation is called that.</p>
			) : (
				groups.map((group) => (
					// A labelled group, not a heading: the page's own heading comes after this list.
					<section key={group.label} aria-label={group.label} className="flex flex-col gap-0.5">
						<p
							aria-hidden="true"
							className="px-2.5 pt-2 pb-1 font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase"
						>
							{group.label}
						</p>
						<ul className="flex flex-col gap-0.5">
							{group.conversations.map((conversation) => {
								const active = conversation.id === activeId;
								return (
									<li key={conversation.id} className="group relative flex items-center">
										<Link
											href={`${CHAT_ROUTE}?${CONVERSATION_PARAM}=${encodeURIComponent(conversation.id)}`}
											aria-current={active ? "page" : undefined}
											onClick={onOpen}
											title={`${conversation.title} · ${dateFormat.format(new Date(conversation.updatedAt))}`}
											className={cn(
												"flex h-9 min-w-0 flex-1 items-center rounded-lg ps-2.5 pe-9 text-sm transition-colors duration-150 hover:bg-muted",
												active ? "bg-muted font-medium text-foreground" : "text-foreground/85",
											)}
										>
											<span className="truncate">{conversation.title}</span>
										</Link>
										{/* Shown on hover or focus where there is a pointer; always on touch screens. */}
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className={cn(
												"absolute end-0.5 size-8 text-muted-foreground transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100",
												active ? "" : "[@media(hover:hover)]:opacity-0",
											)}
											disabled={deletingId === conversation.id}
											aria-label={`Delete conversation “${conversation.title}”`}
											onClick={() => setConfirming(conversation)}
										>
											<HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} aria-hidden="true" />
										</Button>
									</li>
								);
							})}
						</ul>
					</section>
				))
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
