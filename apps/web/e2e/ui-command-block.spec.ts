import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("header label", { hasText: new RegExp(`^${name}$`, "i") });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Command palette" });
const field = (scope: Locator | Page, name = /^Commands/) => scope.getByRole("combobox", { name });
const options = (scope: Locator) => scope.getByRole("listbox").getByRole("option");
const trigger = (page: Page) => page.getByRole("button", { name: /Search…/ });

/** The text of the option the field's aria-activedescendant points at. */
async function activeLabel(scope: Locator | Page, name?: RegExp) {
	const input = field(scope, name);
	const id = await input.getAttribute("aria-activedescendant");
	if (!id) return null;
	return (await scope.locator(`[id="${id}"] .rx-command-item-label`).textContent())?.trim() ?? null;
}

async function open(page: Page) {
	await page.keyboard.press("ControlOrMeta+k");
	await expect(dialog(page)).toBeVisible();
	await expect(field(dialog(page))).toBeFocused();
}

test.describe("rabtx docs: command palette block", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/blocks/command");
		await expect(
			page.getByRole("heading", { name: "Command palette block", level: 1 }),
		).toBeVisible();
	});

	test("the trigger shows the shortcut, and ⌘K / Ctrl+K toggles a native modal dialog", async ({
		page,
	}) => {
		await expect(trigger(page)).toHaveAttribute("aria-haspopup", "dialog");
		await expect(trigger(page)).toHaveAttribute("aria-keyshortcuts", "Meta+K Control+K");
		await expect(trigger(page).locator("kbd")).toHaveCount(2);
		await expect(dialog(page)).toBeHidden();

		await open(page);
		const box = dialog(page);
		expect(await box.evaluate((node) => node.tagName === "DIALOG" && node.matches(":modal"))).toBe(
			true,
		);
		const input = field(box);
		await expect(input).toHaveAttribute("aria-expanded", "true");
		await expect(input).toHaveAttribute("aria-autocomplete", "list");
		const list = await input.getAttribute("aria-controls");
		await expect(box.locator(`[id="${list}"]`)).toHaveAttribute("role", "listbox");
		// Recent first, then the groups, each named by its heading.
		await expect(box.getByRole("group", { name: "Recent" })).toBeVisible();
		await expect(box.getByRole("group", { name: "Navigation" })).toBeVisible();
		expect(await activeLabel(box)).toBe("Dark");

		await page.keyboard.press("ControlOrMeta+k");
		await expect(dialog(page)).toBeHidden();

		await trigger(page).click();
		await expect(field(dialog(page))).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(dialog(page)).toBeHidden();
		await expect(trigger(page)).toBeFocused();
	});

	test("arrows wrap and skip disabled options, Home and End jump, and the highlight follows", async ({
		page,
	}) => {
		await open(page);
		const box = dialog(page);
		await page.keyboard.press("ArrowDown");
		expect(await activeLabel(box)).toBe("Go to Home");
		await page.keyboard.press("ArrowUp");
		await page.keyboard.press("ArrowUp");
		expect(await activeLabel(box)).toBe("Sign out");
		await page.keyboard.press("Home");
		expect(await activeLabel(box)).toBe("Dark");
		await page.keyboard.press("End");
		expect(await activeLabel(box)).toBe("Sign out");

		// Archive project is disabled: the arrows step over it.
		await page.keyboard.press("Home");
		// oxlint-disable-next-line no-await-in-loop -- key presses must land one after another
		for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
		expect(await activeLabel(box)).toBe("New project");
		await page.keyboard.press("ArrowDown");
		expect(await activeLabel(box)).toBe("Change theme");
		await expect(box.getByRole("option", { name: /Archive project/ })).toHaveAttribute(
			"aria-disabled",
			"true",
		);

		// Exactly one option is selected, and the highlight settles on it (anchor positioning).
		await expect(box.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);
		const active = box.locator('[role="option"][aria-selected="true"]');
		await expect(active).toBeInViewport();
		await expect
			.poll(async () => {
				const [a, h] = await Promise.all([
					active.boundingBox(),
					box.locator(".rx-command-highlight").boundingBox(),
				]);
				return a && h ? Math.abs(a.y - h.y) + Math.abs(a.height - h.height) : 999;
			})
			.toBeLessThan(1);
	});

	test("fuzzy search ranks and marks matches, Enter runs it, and it becomes recent", async ({
		page,
	}) => {
		await open(page);
		const box = dialog(page);
		await page.keyboard.type("nf");
		expect(await activeLabel(box)).toBe("New file");
		await expect(box.getByRole("option").first().locator("mark")).toHaveText(["N", "f"]);
		await expect(box.locator("p.sr-only[aria-live]")).toHaveText(/\d+ results?/);
		await expect(box.getByRole("group", { name: "Recent" })).toHaveCount(0);

		await page.keyboard.press("Enter");
		await expect(dialog(page)).toBeHidden();
		await expect(page.getByText("Ran: New file")).toBeVisible();

		await open(page);
		await expect(
			dialog(page).getByRole("group", { name: "Recent" }).getByRole("option"),
		).toHaveText([/New file/, /Dark/]);
		// A fresh session: the old query is gone.
		await expect(field(dialog(page))).toHaveValue("");
	});

	test("a query on the first page finds commands in the pages below it", async ({ page }) => {
		await open(page);
		await page.keyboard.type("dark");
		const box = dialog(page);
		expect(await activeLabel(box)).toBe("Dark");
		await expect(box.getByRole("option").first()).toContainText("Change theme");
		await page.keyboard.press("Enter");
		await expect(page.getByText("Ran: Dark")).toBeVisible();
	});

	test("a command with items opens a page; Backspace and Escape step back before closing", async ({
		page,
	}) => {
		await open(page);
		const box = dialog(page);
		await page.keyboard.type("change theme");
		await page.keyboard.press("Enter");
		const input = field(box, /Change theme/);
		await expect(input).toHaveAttribute("placeholder", "Choose a theme…");
		await expect(input).toHaveValue("");
		await expect(options(box)).toHaveText([/Light/, /Dark/, /Match the system/]);
		await expect(box.getByRole("navigation", { name: "Pages" })).toContainText("Change theme");
		await expect(box.locator("p.sr-only[aria-live]")).toHaveText("Change theme, 3 commands");

		await page.keyboard.press("Backspace");
		await expect(field(box)).toHaveAttribute("placeholder", "Type a command or search…");
		await expect(box.getByRole("navigation", { name: "Pages" })).toHaveCount(0);

		await page.keyboard.type("theme");
		await page.keyboard.press("Enter");
		await expect(field(box, /Change theme/)).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog(page)).toBeVisible();
		await expect(field(box)).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(dialog(page)).toBeHidden();
	});

	test("a page that loads shows skeleton rows and a busy list, then its commands", async ({
		page,
	}) => {
		await open(page);
		const box = dialog(page);
		await page.keyboard.type("switch team");
		await page.keyboard.press("Enter");
		await expect(box.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
		await expect(box.locator(".rx-command-skeleton")).toHaveCount(4);
		await expect(options(box)).toHaveText([/Design/, /Platform/, /Growth/]);
		await expect(box.getByRole("listbox")).not.toHaveAttribute("aria-busy");
		await expect(box.getByRole("group", { name: "Teams" })).toBeVisible();
	});

	test("nothing matching shows the empty state with no active option", async ({ page }) => {
		await open(page);
		const box = dialog(page);
		await page.keyboard.type("zzzz");
		await expect(box.getByText("No results for “zzzz”.")).toBeVisible();
		await expect(options(box)).toHaveCount(0);
		await expect(field(box)).not.toHaveAttribute("aria-activedescendant");
		await expect(box.locator("p.sr-only[aria-live]")).toHaveText("No results");
	});

	test("the list eases to its new height on the panel spring", async ({ page }) => {
		await open(page);
		const viewport = dialog(page).locator(".rx-command-viewport");
		await expect(viewport).toHaveCSS("transition-property", /height/);
		const before = await viewport.evaluate((node) => node.getBoundingClientRect().height);
		await page.keyboard.type("sign out");
		// Mid-way the viewport is between the two heights; it then settles on the content's.
		await expect
			.poll(() => viewport.evaluate((node) => getComputedStyle(node).getPropertyValue("--_h")))
			.not.toBe(`${before}px`);
		await expect
			.poll(() =>
				viewport.evaluate(
					(node) =>
						Math.abs(node.getBoundingClientRect().height - node.firstElementChild!.scrollHeight) <
						1,
				),
			)
			.toBe(true);
		expect(await viewport.evaluate((node) => node.getBoundingClientRect().height)).toBeLessThan(
			before,
		);
	});

	test("the pointer moves the highlight and a click runs the command", async ({ page }) => {
		await open(page);
		const box = dialog(page);
		const inbox = box.getByRole("option", { name: /Open inbox/ });
		await inbox.hover();
		await expect(inbox).toHaveAttribute("aria-selected", "true");
		await inbox.click();
		await expect(dialog(page)).toBeHidden();
		await expect(page.getByText("Ran: Open inbox")).toBeVisible();
	});

	test("Motion off stops the highlight and the height from animating", async ({ page }) => {
		await mode(page, "off").click();
		await open(page);
		const box = dialog(page);
		await expect(box.locator(".rx-command-highlight")).toHaveCSS("transition-duration", "0s");
		await expect(box.locator(".rx-command-viewport")).toHaveCSS("transition-duration", "0s");
	});

	test("the inline panel narrows to a scope with tabs", async ({ page }) => {
		const panel = page.locator('[data-slot="command"]').filter({
			has: page.getByRole("combobox", { name: "Inline commands" }),
		});
		await expect(panel.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
		await panel.getByRole("tab", { name: "Actions" }).click();
		await expect(options(panel)).toHaveText([/New file/, /New project/, /Archive project/]);
		await field(panel, /Inline commands/).fill("project");
		await expect(options(panel)).toHaveText([/New project/, /Archive project/]);
	});

	test("your own search: loading, then results as given", async ({ page }) => {
		await page.getByRole("button", { name: "Search people" }).click();
		const box = dialog(page);
		await expect(box.getByText("Type a name, such as Ada.")).toBeVisible();
		await page.keyboard.type("ada");
		await expect(box.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
		await expect(options(box)).toHaveText([/Ada Lovelace/]);
		await page.keyboard.type("x");
		await expect(box.getByText("Nobody called “adax”.")).toBeVisible();
	});
});
