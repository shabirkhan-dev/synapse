import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("header label", { hasText: new RegExp(`^${name}$`, "i") });
const block = (page: Page) => page.getByRole("region", { name: "Settings", exact: true });
const narrow = (page: Page) => page.getByRole("region", { name: "Preferences", exact: true });
const tab = (root: Locator, name: string) =>
	root.getByRole("tab", { name: new RegExp(`^${name}`) });
const panel = (root: Locator, section: string) =>
	root.locator(`[role="tabpanel"][data-section="${section}"]`);
const bar = (root: Locator) => root.getByRole("region", { name: "Unsaved changes" });
const live = (root: Locator) => root.locator(":scope > p.sr-only[aria-live]");
const save = (root: Locator) =>
	bar(root).getByRole("button", { name: /Save changes|Saving|Saved|Try again/ });

test.describe("rabtx docs: settings block", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/blocks/settings");
		await expect(page.getByRole("heading", { name: "Settings block", level: 1 })).toBeVisible();
	});

	test("five sections as vertical tabs beside the panel, Profile open and nothing unsaved", async ({
		page,
	}) => {
		const root = block(page);
		const list = root.getByRole("tablist", { name: "Settings sections" });
		await expect(list).toHaveAttribute("aria-orientation", "vertical");
		await expect(list.getByRole("tab")).toHaveText([
			"Profile",
			"Account",
			"Notifications",
			"Appearance",
			"Danger zone",
		]);
		await expect(tab(root, "Profile")).toHaveAttribute("aria-selected", "true");
		await expect(panel(root, "profile")).toBeVisible();
		await expect(panel(root, "account")).toBeHidden();
		await expect(bar(root)).toBeHidden();
		await expect(root.getByLabel("Display name")).toHaveValue("Ada Lovelace");
		await expect(root.getByText("Pro", { exact: true }).first()).toBeVisible();
		// The list sits beside the panel, not above it.
		const listBox = (await list.boundingBox())!;
		const panelBox = (await panel(root, "profile").boundingBox())!;
		expect(panelBox.x).toBeGreaterThan(listBox.x + listBox.width);
		expect(Math.abs(panelBox.y - listBox.y)).toBeLessThan(4);
	});

	test("sections switch by click and by keyboard, the arrows following the layout", async ({
		page,
	}) => {
		const root = block(page);
		await tab(root, "Notifications").click();
		await expect(panel(root, "notifications")).toBeVisible();
		await expect(panel(root, "profile")).toBeHidden();
		await expect(root.getByRole("switch", { name: "Mentions" })).toBeChecked();

		await tab(root, "Notifications").focus();
		await page.keyboard.press("ArrowDown");
		await expect(tab(root, "Appearance")).toBeFocused();
		await expect(tab(root, "Appearance")).toHaveAttribute("aria-selected", "true");
		await expect(root.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
		await page.keyboard.press("End");
		await expect(tab(root, "Danger zone")).toHaveAttribute("aria-selected", "true");
		await expect(root.getByRole("button", { name: "Delete account" })).toBeVisible();
		await page.keyboard.press("Home");
		await expect(tab(root, "Profile")).toHaveAttribute("aria-selected", "true");
		// Tab moves from the tab list into the open panel.
		await page.keyboard.press("Tab");
		await expect(panel(root, "profile")).toBeFocused();
		// After the first change the cards rise in.
		await expect(root).toHaveAttribute("data-moved", "");
		await expect(panel(root, "profile").locator(".rx-settings-section").first()).toHaveCSS(
			"transition-property",
			/translate/,
		);
	});

	test("a change slides the bar in, marks its tab and counts; Discard puts everything back", async ({
		page,
	}) => {
		const root = block(page);
		await root.getByLabel("Display name").fill("Ada King");
		await expect(bar(root)).toBeVisible();
		await expect(bar(root)).toContainText("1 unsaved change");
		await expect(tab(root, "Profile")).toHaveAttribute("data-dirty", "");
		await expect(tab(root, "Profile")).toHaveAccessibleName("Profile (unsaved changes)");
		await expect(live(root)).toHaveText(
			"You have unsaved changes. Save or discard them at the bottom.",
		);
		await expect(root.locator(".rx-settings-avatar")).toHaveText("AK");
		// The bar comes in with :has() and @starting-style on the panel spring.
		await expect(bar(root)).toHaveCSS("transition-property", /translate.*display/);
		await expect(bar(root)).toHaveCSS("position", "sticky");

		await tab(root, "Notifications").click();
		await root.getByRole("switch", { name: "Comments" }).click();
		await root.getByRole("checkbox", { name: "Daily summary" }).check();
		await expect(bar(root)).toContainText("3 unsaved changes");
		await expect(tab(root, "Notifications")).toHaveAttribute("data-dirty", "");
		// Changing it back is not a change.
		await root.getByRole("checkbox", { name: "Daily summary" }).uncheck();
		await expect(bar(root)).toContainText("2 unsaved changes");

		await bar(root).getByRole("button", { name: "Discard" }).click();
		await expect(bar(root)).toBeHidden();
		await expect(live(root)).toHaveText("Changes discarded.");
		await expect(panel(root, "notifications")).toBeFocused();
		await expect(root.getByRole("switch", { name: "Comments" })).toBeChecked();
		await tab(root, "Profile").click();
		await expect(root.getByLabel("Display name")).toHaveValue("Ada Lovelace");
		await expect(tab(root, "Profile")).not.toHaveAttribute("data-dirty");
	});

	test("Save shows its progress, then the bar leaves and focus lands on the panel", async ({
		page,
	}) => {
		const root = block(page);
		await tab(root, "Appearance").click();
		await root.getByRole("radio", { name: "Dark" }).check();
		await root.getByRole("radio", { name: "Compact" }).check();
		await expect(bar(root)).toContainText("2 unsaved changes");
		await save(root).click();
		await expect(save(root)).toHaveAttribute("data-state", "loading");
		await expect(save(root)).toHaveAttribute("aria-busy", "true");
		await expect(save(root)).toHaveAttribute("data-state", "success");
		await expect(bar(root)).toContainText("All changes saved.");
		await expect(live(root)).toHaveText("Settings saved.");
		await expect(bar(root)).toBeHidden();
		await expect(panel(root, "appearance")).toBeFocused();
		await expect(root.getByRole("radio", { name: "Dark" })).toBeChecked();
		await expect(tab(root, "Appearance")).not.toHaveAttribute("data-dirty");
	});

	test("Ctrl+S saves from a field", async ({ page }) => {
		const root = block(page);
		await root.getByLabel("Website").fill("https://ada.dev");
		await page.keyboard.press("Control+s");
		await expect(save(root)).toHaveAttribute("data-state", "loading");
		await expect(live(root)).toHaveText("Settings saved.");
		await expect(bar(root)).toBeHidden();
	});

	test("Save checks every section, opens the first error's and focuses the field", async ({
		page,
	}) => {
		const root = block(page);
		await root.getByLabel("Display name").fill("   ");
		await root.getByLabel("Username").fill("Ada!");
		await root.getByLabel("Username").press("Tab");
		await expect(root.getByLabel("Username")).toHaveAccessibleDescription(
			"Use 3 to 20 lowercase letters, numbers or underscores.",
		);
		await tab(root, "Account").click();
		await save(root).click();
		await expect(tab(root, "Profile")).toHaveAttribute("aria-selected", "true");
		await expect(root.getByLabel("Display name")).toBeFocused();
		await expect(root.getByLabel("Display name")).toHaveAccessibleDescription("Enter your name.");
		await expect(root.getByLabel("Display name")).toHaveAttribute("aria-invalid", "true");
		await expect(tab(root, "Profile")).toHaveAttribute("data-invalid", "");
		await expect(live(root)).toHaveText("2 settings need attention in Profile.");
		// Fixing a field clears its error at once.
		await root.getByLabel("Display name").fill("Ada");
		await expect(root.getByLabel("Display name")).not.toHaveAttribute("aria-invalid");
		await root.getByLabel("Username").fill("ada_l");
		await expect(tab(root, "Profile")).not.toHaveAttribute("data-invalid");
	});

	test("an onSave field error keeps the change, opens its section and focuses it", async ({
		page,
	}) => {
		const root = block(page);
		await root.getByLabel("Username").fill("admin");
		await tab(root, "Notifications").click();
		await save(root).click();
		await expect(root.getByLabel("Username")).toBeFocused();
		await expect(root.getByLabel("Username")).toHaveAccessibleDescription(
			"That username is taken.",
		);
		await expect(save(root)).toHaveAttribute("data-state", "error");
		await expect(bar(root)).toContainText("1 unsaved change");
	});

	test("Delete account: type the phrase to confirm, Escape cancels, focus comes back", async ({
		page,
	}) => {
		const root = block(page);
		await tab(root, "Danger zone").click();
		const trigger = root.getByRole("button", { name: "Delete account" });
		await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
		await trigger.click();
		const dialog = page.getByRole("dialog", { name: "Delete your account?" });
		await expect(dialog).toBeVisible();
		const confirm = dialog.getByRole("textbox", { name: /to confirm/ });
		await expect(confirm).toBeFocused();
		const remove = dialog.getByRole("button", { name: /Delete account|Deleting|Deleted/ });
		// Dimmed until the phrase matches the field's pattern, but still operable.
		await expect(remove).toHaveCSS("opacity", "0.55");
		await remove.click();
		await expect(confirm).toHaveAccessibleDescription(
			"Type “delete my account” exactly to confirm.",
		);
		await expect(confirm).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();

		await trigger.click();
		await expect(confirm).toHaveValue("");
		await confirm.fill("delete my account");
		await expect(remove).toHaveCSS("opacity", "1");
		await confirm.press("Enter");
		await expect(remove).toHaveAttribute("data-state", "loading");
		// Busy: Escape does not close it.
		await page.keyboard.press("Escape");
		await expect(dialog).toBeVisible();
		await expect(remove).toHaveAttribute("data-state", "success");
		await expect(dialog).toBeHidden();
		await expect(root.getByText("Scheduled for deletion", { exact: true })).toBeVisible();
		await expect(live(root)).toHaveText("Your account is scheduled for deletion.");
		await expect(panel(root, "danger")).toBeFocused();
	});

	test("Change email: checks the address, shows a refusal, then updates the email", async ({
		page,
	}) => {
		const root = block(page);
		await tab(root, "Account").click();
		await root.getByRole("button", { name: "Change email" }).click();
		const dialog = page.getByRole("dialog", { name: "Change email" });
		const input = dialog.getByLabel("New email");
		await expect(input).toBeFocused();
		await input.fill("ada@example");
		await input.press("Enter");
		await expect(input).toHaveAccessibleDescription(
			"Enter an email address like name@example.com.",
		);
		await input.fill("ada@example.com");
		await input.press("Enter");
		await expect(input).toHaveAccessibleDescription("That is already your email.");
		await input.fill("taken@example.com");
		await input.press("Enter");
		await expect(input).toHaveAccessibleDescription("That email is already in use.");
		await expect(input).toBeFocused();
		await input.fill("ada@lovelace.dev");
		await dialog.getByRole("button", { name: /Send link|Try again/ }).click();
		await expect(dialog.getByRole("button", { name: /Link sent/ })).toBeVisible();
		await expect(dialog).toBeHidden();
		await expect(root.locator(".rx-settings-row").first()).toContainText("ada@lovelace.dev");
		await expect(live(root)).toHaveText("We sent a confirmation link to ada@lovelace.dev.");
		await expect(root.getByRole("button", { name: "Change email" })).toBeFocused();
		// It is not a form change.
		await expect(bar(root)).toBeHidden();
	});

	test("a narrow block puts the tabs on top by its own width, with left and right arrows", async ({
		page,
	}) => {
		const root = narrow(page);
		const list = root.getByRole("tablist");
		await expect(list).toHaveAttribute("aria-orientation", "horizontal");
		await expect(tab(root, "Appearance")).toHaveAttribute("aria-selected", "true");
		await expect(root.getByRole("radio", { name: "Dark" })).toBeChecked();
		const listBox = (await list.boundingBox())!;
		const panelBox = (await panel(root, "appearance").boundingBox())!;
		expect(panelBox.y).toBeGreaterThan(listBox.y + listBox.height);
		await tab(root, "Appearance").focus();
		await page.keyboard.press("ArrowRight");
		await expect(tab(root, "Danger zone")).toHaveAttribute("aria-selected", "true");
		await page.keyboard.press("ArrowLeft");
		await expect(tab(root, "Appearance")).toHaveAttribute("aria-selected", "true");
	});

	test("on a phone the tabs scroll sideways and the bar sticks to the bottom", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		const root = block(page);
		const list = root.getByRole("tablist", { name: "Settings sections" });
		await expect(list).toHaveAttribute("aria-orientation", "horizontal");
		expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
		await tab(root, "Profile").focus();
		await page.keyboard.press("End");
		await expect(tab(root, "Danger zone")).toBeInViewport();
		await page.keyboard.press("Home");
		await root.getByLabel("Display name").fill("Ada King");
		await expect(bar(root)).toBeVisible();
		// Sticky to the bottom of the nearest scroller (here the example frame, which clips).
		await expect(bar(root)).toHaveCSS("position", "sticky");
		await expect(bar(root)).toHaveCSS("bottom", "16px");
		await save(root).scrollIntoViewIfNeeded();
		await expect(save(root)).toBeInViewport();
		const box = (await bar(root).boundingBox())!;
		expect(box.width).toBeLessThanOrEqual(375);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			375,
		);
	});

	test("Motion off and reduced motion stop the slides", async ({ page }) => {
		await mode(page, "off").click();
		const root = block(page);
		await root.getByLabel("Display name").fill("Ada King");
		await expect(bar(root)).toHaveCSS("transition-duration", "0s");
		await expect(bar(root)).toHaveCSS("translate", "none");
		await mode(page, "on").click();
		await page.emulateMedia({ reducedMotion: "reduce" });
		await expect(bar(root)).toHaveCSS("transition-property", "opacity, display");
	});

	test("in dark mode the block follows the theme and the drawings keep theirs", async ({
		page,
	}) => {
		await mode(page, "dark").click();
		const root = block(page);
		await expect(root.getByRole("heading", { name: "Settings", exact: true })).toHaveCSS(
			"color",
			"rgb(235, 235, 235)",
		);
		await tab(root, "Appearance").click();
		const light = root.locator('.rx-settings-swatch[data-theme="light"] > span');
		await expect(light).toHaveCSS("background-color", "rgb(255, 255, 255)");
	});
});
