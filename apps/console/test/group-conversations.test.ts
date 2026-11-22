import { describe, expect, test } from "bun:test";

import { groupConversations } from "@/features/chat/utils/group-conversations";

const conversation = (id: string, updatedAt: string) => ({
	id,
	title: id,
	createdAt: updatedAt,
	updatedAt,
});

describe("groupConversations", () => {
	test("groups by local day of last activity, most recent group first, empty groups left out", () => {
		const now = new Date(2026, 10, 22, 15, 0);
		const at = (days: number, hour = 9) => new Date(2026, 10, 22 - days, hour).toISOString();
		const groups = groupConversations(
			[
				conversation("this morning", at(0)),
				conversation("last night", at(1, 23)),
				conversation("tuesday", at(5)),
				conversation("last month", at(30)),
			],
			now,
		);
		expect(groups.map((group) => [group.label, group.conversations.map((c) => c.id)])).toEqual([
			["Today", ["this morning"]],
			["Yesterday", ["last night"]],
			["Previous 7 days", ["tuesday"]],
			["Older", ["last month"]],
		]);
		expect(groupConversations([conversation("x", at(0))], now).map((g) => g.label)).toEqual([
			"Today",
		]);
	});
});
