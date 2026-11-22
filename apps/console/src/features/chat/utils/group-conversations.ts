import type { Conversation } from "../types/chat.types";

export type ConversationGroup = { label: string; conversations: Conversation[] };

const DAY = 24 * 60 * 60 * 1000;

/**
 * Most recent first, in groups by last activity: Today, Yesterday, Previous 7 days, Older (local
 * calendar days). Empty groups are left out.
 */
export function groupConversations(
	conversations: Conversation[],
	now: Date = new Date(),
): ConversationGroup[] {
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const groups: ConversationGroup[] = [
		{ label: "Today", conversations: [] },
		{ label: "Yesterday", conversations: [] },
		{ label: "Previous 7 days", conversations: [] },
		{ label: "Older", conversations: [] },
	];
	for (const conversation of conversations) {
		const at = new Date(conversation.updatedAt).getTime();
		const index = at >= today ? 0 : at >= today - DAY ? 1 : at >= today - 7 * DAY ? 2 : 3;
		groups[index]?.conversations.push(conversation);
	}
	return groups.filter((group) => group.conversations.length > 0);
}
