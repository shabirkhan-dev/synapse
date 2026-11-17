"use client";

import { BubbleChatIcon, File01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ACCOUNT_PAGE, NAV } from "@/components/layout/navigation";
import { CHAT_ROUTE, CONVERSATION_PARAM, useConversationsQuery } from "@/features/chat";
import { documentRoute, useDocumentsQuery } from "@/features/documents";

import { CommandPalette, type PaletteGroup } from "../components/command-palette";
import { usePaletteShortcut } from "../hooks/use-palette-shortcut";

/** Most recent conversations and documents listed (typing narrows them). */
const RECENT = 8;

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** ⌘K / Ctrl+K: jump to any page, a recent conversation or a document. */
export function CommandPaletteContainer() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const toggle = useCallback(() => setOpen((value) => !value), []);
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
					...(conversations.data ?? []).slice(0, RECENT).map((conversation) => ({
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
				entries: (documents.data ?? []).slice(0, RECENT).map((document) => ({
					id: document.id,
					label: document.title,
					hint: "document",
					href: documentRoute(document.id),
					icon: File01Icon,
				})),
			},
		],
		[conversations.data, documents.data],
	);

	return (
		<CommandPalette
			open={open}
			onOpenChange={setOpen}
			groups={groups}
			loading={conversations.isPending || documents.isPending}
			shortcut={isMac() ? "⌘K" : "Ctrl K"}
			onSelect={(entry) => {
				setOpen(false);
				router.push(entry.href);
			}}
		/>
	);
}
