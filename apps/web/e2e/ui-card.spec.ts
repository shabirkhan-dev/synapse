import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });
/** The card around a part, found by its title text. */
const cardOf = (page: Page, title: string) =>
	page.locator("[data-slot=card]", { has: page.getByText(title, { exact: true }) }).first();
/** Scrolls a locator into view and returns its box, for mouse moves in viewport coordinates. */
const boxOf = async (el: Locator) => {
	await el.scrollIntoViewIfNeeded();
	const box = await el.boundingBox();
	if (!box) throw new Error("no box");
	return box;
};
const style = (el: Locator, prop: string, pseudo?: string) =>
	el.evaluate(
		(node, [name, after]) => getComputedStyle(node, after || null).getPropertyValue(name),
		[prop, pseudo ?? ""] as const,
	);

test.describe("rabtx docs: card", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/card");
		await expect(page.getByRole("heading", { name: "Card", level: 1 })).toBeVisible();
	});

	test("renders the shadcn parts as a labelled section with a heading", async ({ page }) => {
		const card = page.getByRole("region", { name: "Review order" });
		await expect(card).toHaveAttribute("data-slot", "card");
		await expect(card.getByRole("heading", { name: "Review order", level: 3 })).toBeVisible();
		await Promise.all(
			["card-header", "card-description", "card-action", "card-content"].map((slot) =>
				expect(card.locator(`[data-slot=${slot}]`)).toHaveCount(1),
			),
		);
		await expect(card).not.toHaveAttribute("tabindex");
	});

	test("padding is 12, 16 and 20 including the border", async ({ page }) => {
		const offsets = await Promise.all(
			["sm", "default", "lg"].map((size) =>
				cardOf(page, size).evaluate((card) => {
					const title = card.querySelector("[data-slot=card-title]") as HTMLElement;
					const a = card.getBoundingClientRect();
					const b = title.getBoundingClientRect();
					return [b.left - a.left, b.top - a.top];
				}),
			),
		);
		expect(offsets).toEqual([
			[12, 12],
			[16, 16],
			[20, 20],
		]);
	});

	test("the radius follows the box tier in every mode, media takes the corners", async ({
		page,
	}) => {
		const card = page.getByRole("region", { name: "Review order" });
		const radius = () => style(card, "border-top-left-radius");
		expect(await radius()).toBe("12px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("4px");
		await mode(page, "round").click();
		expect(await radius()).toBe("20px");
		const media = page.getByRole("img", { name: "A sunlit studio with long desks" });
		expect(await style(media, "border-top-left-radius")).toBe("19px");
		const [cardBox, mediaBox] = await Promise.all([
			cardOf(page, "Studio, Lisbon").boundingBox(),
			media.boundingBox(),
		]);
		expect(mediaBox?.x).toBe((cardBox?.x ?? 0) + 1);
		expect(mediaBox?.y).toBe((cardBox?.y ?? 0) + 1);
	});

	test("Flat is one border color and does not move the layout", async ({ page }) => {
		const card = page.getByRole("region", { name: "Review order" });
		const before = await card.boundingBox();
		expect(await style(card, "--_edge-a")).not.toBe(await style(card, "--_edge-b"));
		await mode(page, "flat").click();
		expect(await style(card, "--_edge-a")).toBe(await style(card, "--_edge-b"));
		expect(await card.boundingBox()).toEqual(before);
	});

	test("a plain card does not react to hover or press", async ({ page }) => {
		const card = page.getByRole("region", { name: "Review order" });
		const ring = await style(card, "--_ring");
		await card.getByText("Seats").hover();
		await page.mouse.down();
		expect(await style(card, "scale")).toBe("none");
		expect(await style(card, "--_ring")).toBe(ring);
		await page.mouse.up();
	});

	test("a link card: the whole card is the link, other buttons stay usable", async ({ page }) => {
		const card = cardOf(page, "rabtx/ui");
		const box = await boxOf(card);
		// The star button sits above the stretched link.
		await card.getByRole("button", { name: "Star rabtx/ui" }).click();
		expect(new URL(page.url()).hash).toBe("");
		// Hover strengthens the ring, a press springs the card down.
		await page.mouse.move(0, 0);
		const ring = await style(card, "--_ring");
		await page.mouse.move(box.x + box.width - 20, box.y + box.height - 12);
		expect(await style(card, "--_ring")).not.toBe(ring);
		await page.mouse.down();
		await expect.poll(() => style(card, "scale")).toBe("0.985");
		await page.mouse.up();
		await expect(page).toHaveURL(/#rabtx\/ui$/);
	});

	test("a link card shows keyboard focus on the card, not the link", async ({ page }) => {
		const link = page.getByRole("link", { name: "rabtx/springs" });
		const card = cardOf(page, "rabtx/springs");
		await link.focus();
		await page.keyboard.press("Shift+Tab");
		await page.keyboard.press("Tab");
		await expect(link).toBeFocused();
		expect(await style(card, "outline-style")).toBe("solid");
		expect(await style(card, "outline-color")).toBe("rgb(45, 124, 246)");
		expect(await style(link, "outline-style")).toBe("none");
	});

	test("selectable cards: a click anywhere picks the radio and marks the card", async ({
		page,
	}) => {
		const starter = page.getByRole("radio", { name: "Starter" });
		const card = cardOf(page, "For one person and a side project.");
		await expect(page.getByRole("radio", { name: "Team" })).toBeChecked();
		// The edge is a gradient border, so its colors are the private edge variables.
		expect(await style(card, "--_edge-a")).not.toBe("rgb(45, 124, 246)");
		const box = await boxOf(card);
		await page.mouse.click(box.x + box.width / 2, box.y + box.height - 8);
		await expect(starter).toBeChecked();
		await expect.poll(() => style(card, "--_edge-a")).toBe("rgb(45, 124, 246)");
		expect(await style(card, "--_edge-b")).toBe("rgb(45, 124, 246)");
		await expect(page.getByRole("radio", { name: "Scale (sold out)" })).toBeDisabled();
		await cardOf(page, "SSO and audit logs.").click({ force: true });
		await expect(starter).toBeChecked();
	});

	test("a tilt card leans toward the pointer and springs back flat", async ({ page }) => {
		const card = cardOf(page, "Tilt me");
		const box = await boxOf(card);
		const flat = await style(card, "transform");
		await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
		await expect(card).toHaveAttribute("data-pointer");
		expect(Number.parseFloat(await style(card, "--_tilt-y"))).toBeGreaterThan(4);
		await expect.poll(() => style(card, "opacity", "::before")).toBe("1");
		await expect.poll(() => style(card, "transform")).not.toBe(flat);
		await page.mouse.move(0, 0);
		await expect(card).not.toHaveAttribute("data-pointer");
		await expect.poll(() => style(card, "transform")).toBe(flat);
		await mode(page, "off").click();
		await page.mouse.move(box.x + box.width - 4, box.y + 4);
		expect(await style(card, "transform")).toBe("none");
	});

	test("a spotlight card lights up under the pointer and on keyboard focus", async ({ page }) => {
		const card = cardOf(page, "Edge functions");
		expect(await style(card, "opacity", "::after")).toBe("0");
		const box = await boxOf(card);
		await page.mouse.move(box.x + 30, box.y + 30);
		await expect(card).toHaveAttribute("data-pointer");
		expect(await style(card, "--_px")).toMatch(/%$/);
		await expect.poll(() => style(card, "opacity", "::after")).toBe("1");
		await page.mouse.move(0, 0);
		await expect.poll(() => style(card, "opacity", "::after")).toBe("0");
		await page.getByRole("link", { name: "Edge functions" }).focus();
		await page.keyboard.press("Shift+Tab");
		await page.keyboard.press("Tab");
		await expect.poll(() => style(card, "opacity", "::before")).toBe("1");
	});

	test("expandable cards: native details, one open per name, height grows smoothly", async ({
		page,
	}) => {
		const first = page.locator("details[data-slot=card]", { hasText: "Can I change plans later?" });
		const second = page.locator("details[data-slot=card]", { hasText: "Do you offer refunds?" });
		await expect(first).toHaveAttribute("open", "");
		const closed = (await boxOf(second)).height;
		await second.locator("summary").click();
		await page.waitForTimeout(90);
		const mid = (await second.boundingBox())!.height;
		await page.waitForTimeout(700);
		const open = (await second.boundingBox())!.height;
		expect(mid).toBeGreaterThan(closed);
		expect(mid).toBeLessThan(open);
		await expect(first).not.toHaveAttribute("open");
		await expect(second.getByText("Within 14 days")).toBeVisible();
		// The keyboard toggles it, and focus is drawn on the card.
		await second.locator("summary").press("Enter");
		await expect(second).not.toHaveAttribute("open");
		expect(await style(second, "outline-style")).toBe("solid");
	});

	test("a stack piles cards, spreads them on click and folds back from the button", async ({
		page,
	}) => {
		const stack = page.getByRole("region", { name: "Notifications" });
		const toggle = stack.getByRole("button", { name: "Show all 4 notifications" });
		const items = stack.locator("li");
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect((await items.nth(1).boundingBox())?.height).toBe(10);
		await expect(items.nth(1)).toHaveAttribute("inert", "");
		await expect(items.nth(0)).not.toHaveAttribute("inert");
		// A click on the pile opens it.
		const first = await boxOf(items.nth(0));
		await page.mouse.click(first.x + first.width / 2, first.y + first.height + 6);
		const less = stack.getByRole("button", { name: "Show less" });
		await expect(less).toHaveAttribute("aria-expanded", "true");
		await expect(items.nth(3)).not.toHaveAttribute("inert");
		const cardHeight = await items
			.nth(3)
			.locator("[data-slot=card]")
			.evaluate((el) => (el as HTMLElement).offsetHeight);
		await expect.poll(async () => (await items.nth(3).boundingBox())?.height).toBe(cardHeight);
		await expect(stack.getByText("New sign-in")).toBeVisible();
		await less.focus();
		await page.keyboard.press("Enter");
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
	});

	test("the page fits a phone", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		const { scrollWidth, clientWidth } = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		}));
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	});
});
