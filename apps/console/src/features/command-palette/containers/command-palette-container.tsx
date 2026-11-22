"use client";

import { BubbleChatIcon, File01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ACCOUNT_PAGE, NAV } from "@/components/layout/navigation";
import {
	CHAT_ROUTE,
	CONVERSATION_PARAM,
	useConversationSearchQuery,
	useConversationsQuery,
} from "@/features/chat";
import { documentRoute, useDocumentSearchQuery, useDocumentsQuery } from "@/features/documents";

import { CommandPalette, type PaletteGroup } from "../components/command-palette";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { usePaletteShortcut } from "../hooks/use-palette-shortcut";

/** The latest conversations and documents shown before anything is typed. */
const RECENT = 8;

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * ⌘K / Ctrl+K / "/": jump to any page, conversation or document. Empty, it lists the latest; typed
 * (two characters or more), it searches every document and conversation title on the server.
 */
export function CommandPaletteContainer() {
	const router = useRouter();
	const [open, setOpenState] = useState(false);
	const [search, setSearch] = useState("");
	const setOpen = useCallback((next: boolean) => {
		setOpenState(next);
		if (!next) setSearch("");
	}, []);
	const toggle = useCallback(() => setOpen(!open), [open, setOpen]);
	const query = useDebouncedValue(search.trim(), 200);
	const searchingServer = query.length >= 2;
	const foundConversations = useConversationSearchQuery(searchingServer ? query : "");
	const foundDocuments = useDocumentSearchQuery(searchingServer ? query : "");
	usePaletteShortcut(toggle);
	// Loaded only once the palette is first opened.
	const conversations = useConversationsQuery({ enabled: open });
	const documents = useDocumentsQuery({ enabled: open });

	const groups = useMemo<PaletteGroup[]>(
		() => [
			{
				heading: "Pages",
				entries: [...NAV.flatMap((group) => group.items), ACCOUNT_PAGE].map((item) => ({
					id: item.href,
					label: item.label,
					href: item.href,
					icon: item.icon,
				})),
			},
			{
				heading: "Conversations",
				entries: [
					{ id: "new-chat", label: "New chat", href: CHAT_ROUTE, icon: PlusSignIcon },
					...((searchingServer ? foundConversations.data : conversations.data) ?? [])
						.slice(0, RECENT)
						.map((conversation) => ({
							id: conversation.id,
							label: conversation.title,
							hint: "conversation",
							href: `${CHAT_ROUTE}?${CONVERSATION_PARAM}=${encodeURIComponent(conversation.id)}`,
							icon: BubbleChatIcon,
						})),
				],
			},
			{
				heading: "Documents",
				entries: ((searchingServer ? foundDocuments.data : documents.data) ?? [])
					.slice(0, RECENT)
					.map((document) => ({
						id: document.id,
						label: document.title,
						hint: "document",
						href: documentRoute(document.id),
						icon: File01Icon,
					})),
			},
		],
		[
			conversations.data,
			documents.data,
			foundConversations.data,
			foundDocuments.data,
			searchingServer,
		],
	);

	return (
		<CommandPalette
			open={open}
			onOpenChange={setOpen}
			groups={groups}
			loading={conversations.isPending || documents.isPending}
			search={search}
			onSearchChange={setSearch}
			searching={
				search.trim() !== query ||
				(searchingServer && (foundConversations.isFetching || foundDocuments.isFetching))
			}
			shortcut={isMac() ? "⌘K" : "Ctrl K"}
			onSelect={(entry) => {
				setOpen(false);
				router.push(entry.href);
			}}
		/>
	);
}
