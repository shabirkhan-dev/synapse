"use client";

import { BubbleChatIcon, File01Icon } from "@hugeicons/core-free-icons";

import { RecentLinks } from "@/components/layout/recent-links";
import { CHAT_ROUTE, CONVERSATION_PARAM, useConversationsQuery } from "@/features/chat";
import { documentRoute, useDocumentsQuery } from "@/features/documents";

const CONVERSATIONS = 3;
const DOCUMENTS = 2;

/** The latest conversations and documents, for the sidebar's Recent group. */
export function RecentContainer() {
	const conversations = useConversationsQuery();
	const documents = useDocumentsQuery();
	return (
		<RecentLinks
			links={[
				...(conversations.data ?? []).slice(0, CONVERSATIONS).map((conversation) => ({
					href: `${CHAT_ROUTE}?${CONVERSATION_PARAM}=${encodeURIComponent(conversation.id)}`,
					label: conversation.title,
					tag: "Chat",
					icon: BubbleChatIcon,
				})),
				...(documents.data ?? []).slice(0, DOCUMENTS).map((document) => ({
					href: documentRoute(document.id),
					label: document.title,
					tag: "Doc",
					icon: File01Icon,
				})),
			]}
		/>
	);
}
