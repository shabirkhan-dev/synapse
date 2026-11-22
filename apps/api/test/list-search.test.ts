import { describe, expect, test } from "bun:test";

import { authHeaders, buildTestApp } from "./helpers";

describe("searching lists by title", () => {
	test("documents and conversations take q; an empty q lists everything", async () => {
		const { app, conversations } = buildTestApp();
		const headers = await authHeaders();
		for (const [title, content] of [
			["Refund policy", "Refunds within 30 days."],
			["Shipping", "Orders ship in two days."],
		]) {
			// oxlint-disable-next-line no-await-in-loop -- one at a time
			await app.request("/api/v1/rag/documents", {
				method: "POST",
				headers,
				body: JSON.stringify({ title, content }),
			});
		}
		await conversations.create("user-1", "Refund window?");
		await conversations.create("user-1", "Express shipping");
		const titles = async (path: string) =>
			((await (await app.request(path, { headers })).json()).data as { title: string }[]).map(
				(item) => item.title,
			);

		expect(await titles("/api/v1/rag/documents?q=refund")).toEqual(["Refund policy"]);
		expect(await titles("/api/v1/rag/documents?q=%20")).toHaveLength(2);
		expect(await titles("/api/v1/memory/conversations?q=SHIPPING")).toEqual(["Express shipping"]);
		expect(await titles("/api/v1/memory/conversations?q=nothing")).toEqual([]);
	});
});
