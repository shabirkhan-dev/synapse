import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("header label", { hasText: new RegExp(`^${name}$`, "i") });

const list = (page: Page, name: string) => page.getByRole("tablist", { name, exact: true });

/** The indicator's box and the box of the tab it should sit on, rounded to the pixel. */
const rect = (el: Locator) =>
	el.evaluate((node) => {
		const r = node.getBoundingClientRect();
		return {
			x: Math.round(r.x),
			y: Math.round(r.y),
			w: Math.round(r.width),
			h: Math.round(r.height),
		};
	});
const indicator = (tablist: Locator) => tablist.locator(".rx-tabs-indicator");
const fill = (el: Locator) => el.evaluate((node) => getComputedStyle(node).backgroundImage);

test.describe("rabtx docs: tabs", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/tabs");
		await expect(page.getByRole("heading", { name: "Tabs", level: 1 })).toBeVisible();
	});

	test("tabs, panels and their ARIA wiring", async ({ page }) => {
		const settings = list(page, "Settings");
		await expect(settings).toHaveAttribute("aria-orientation", "horizontal");
		const account = settings.getByRole("tab", { name: "Account" });
		const password = settings.getByRole("tab", { name: "Password" });
		await expect(account).toHaveAttribute("aria-selected", "true");
		await expect(password).toHaveAttribute("aria-selected", "false");

		const panelId = await account.getAttribute("aria-controls");
		expect(panelId).toBeTruthy();
		const panel = page.locator(`[id="${panelId}"]`);
		await expect(panel).toHaveRole("tabpanel");
		await expect(panel).toHaveAccessibleName("Account");
		await expect(panel).toBeVisible();
		await expect(panel).toHaveText("Your name, email and avatar.");

		const other = page.locator(`[id="${await password.getAttribute("aria-controls")}"]`);
		await expect(other).toBeHidden();
		await expect(other).toHaveAttribute("hidden", "");

		// A list with no panels (a filter) links to none once it has hydrated.
		await expect(list(page, "Range, md").getByRole("tab").first()).not.toHaveAttribute(
			"aria-controls",
		);
	});

	test("clicking a tab selects it and shows its panel", async ({ page }) => {
		const settings = list(page, "Settings");
		await settings.getByRole("tab", { name: "Password" }).click();
		await expect(settings.getByRole("tab", { name: "Password" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await expect(page.getByRole("tabpanel", { name: "Password" })).toHaveText(
			"Change your password and sign out of other devices.",
		);
		await expect(page.getByRole("tabpanel", { name: "Account" })).toHaveCount(0);
	});

	test("one tab stop; arrows, Home and End select as they move (automatic)", async ({ page }) => {
		const settings = list(page, "Settings");
		const tabs = settings.getByRole("tab");
		await expect(settings.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
		await expect(settings.locator('[role="tab"][tabindex="-1"]')).toHaveCount(2);

		const account = settings.getByRole("tab", { name: "Account" });
		await account.focus();
		await page.keyboard.press("ArrowRight");
		const password = settings.getByRole("tab", { name: "Password" });
		await expect(password).toBeFocused();
		await expect(password).toHaveAttribute("aria-selected", "true");
		await expect(password).toHaveAttribute("tabindex", "0");
		await expect(account).toHaveAttribute("tabindex", "-1");

		await page.keyboard.press("End");
		await expect(tabs.last()).toBeFocused();
		await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
		await page.keyboard.press("ArrowRight");
		await expect(account).toBeFocused();
		await page.keyboard.press("ArrowLeft");
		await expect(tabs.last()).toBeFocused();
		await page.keyboard.press("Home");
		await expect(account).toBeFocused();
		await expect(account).toHaveAttribute("aria-selected", "true");

		// Tab leaves the list for the panel, which is focusable and shows a ring.
		await page.keyboard.press("Tab");
		const panel = page.getByRole("tabpanel", { name: "Account" });
		await expect(panel).toBeFocused();
		await expect(panel).toHaveCSS("outline-width", "2px");
		// Shift+Tab returns to the selected tab, not the first or last one.
		await page.keyboard.press("Shift+Tab");
		await expect(account).toBeFocused();
		await expect(account).toHaveCSS("outline-width", "2px");
	});

	test("manual activation moves focus only; Enter and Space select", async ({ page }) => {
		const deploy = list(page, "Deployment");
		const logs = deploy.getByRole("tab", { name: "Logs" });
		const metrics = deploy.getByRole("tab", { name: "Metrics" });
		const traces = deploy.getByRole("tab", { name: "Traces" });
		await logs.focus();
		await page.keyboard.press("ArrowRight");
		await expect(metrics).toBeFocused();
		await expect(metrics).toHaveAttribute("aria-selected", "false");
		await expect(logs).toHaveAttribute("aria-selected", "true");
		await page.keyboard.press("Enter");
		await expect(metrics).toHaveAttribute("aria-selected", "true");
		await expect(page.getByRole("tabpanel", { name: "Metrics" })).toHaveText(
			"Requests, errors and latency.",
		);
		await page.keyboard.press("ArrowRight");
		await expect(traces).toBeFocused();
		await page.keyboard.press("Space");
		await expect(traces).toHaveAttribute("aria-selected", "true");
	});

	test("vertical lists move with up and down, and ignore left and right", async ({ page }) => {
		const workspace = list(page, "Workspace, segmented");
		await expect(workspace).toHaveAttribute("aria-orientation", "vertical");
		const general = workspace.getByRole("tab", { name: "General" });
		const members = workspace.getByRole("tab", { name: "Members" });
		await general.focus();
		await page.keyboard.press("ArrowRight");
		await expect(general).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await expect(members).toBeFocused();
		await expect(members).toHaveAttribute("aria-selected", "true");
		await page.keyboard.press("ArrowUp");
		await expect(general).toBeFocused();
		await page.keyboard.press("ArrowUp");
		await expect(workspace.getByRole("tab", { name: "Integrations" })).toBeFocused();
		// The tabs stack, and the panel sits beside the list.
		const a = await rect(general);
		const b = await rect(members);
		expect(b.y).toBeGreaterThan(a.y);
		expect(b.x).toBe(a.x);
		const panel = await rect(page.getByRole("tabpanel", { name: "Integrations" }).first());
		expect(panel.x).toBeGreaterThan(a.x + a.w);
	});

	test("a disabled tab is skipped by the arrows and cannot be selected", async ({ page }) => {
		const members = list(page, "Members");
		const removed = members.getByRole("tab", { name: "Removed" });
		await expect(removed).toBeDisabled();
		await removed.click({ force: true });
		await expect(removed).toHaveAttribute("aria-selected", "false");
		await members.getByRole("tab", { name: "Invited" }).click();
		await page.keyboard.press("ArrowRight");
		await expect(members.getByRole("tab", { name: "All" })).toBeFocused();
		await expect(members.getByRole("tab", { name: "All" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("in right-to-left text ArrowLeft goes to the next tab", async ({ page }) => {
		const mail = list(page, "البريد");
		const inbox = mail.getByRole("tab", { name: "الوارد" });
		const sent = mail.getByRole("tab", { name: "المرسل" });
		await inbox.focus();
		await page.keyboard.press("ArrowLeft");
		await expect(sent).toBeFocused();
		// The row starts at the right.
		expect((await rect(sent)).x).toBeLessThan((await rect(inbox)).x);
	});

	test("the indicator is anchored to the selected tab and glides on the tabs spring", async ({
		page,
	}) => {
		const project = list(page, "Project");
		const bar = indicator(project);
		const overview = project.getByRole("tab", { name: "Overview" });
		const settings = project.getByRole("tab", { name: "Settings" });
		expect(await rect(bar)).toEqual(await rect(overview));
		const style = await bar.evaluate((node) => {
			const s = getComputedStyle(node);
			return {
				anchor: s.positionAnchor,
				property: s.transitionProperty,
				easing: s.transitionTimingFunction,
			};
		});
		expect(style.anchor).toBe("--_tab");
		expect(style.property).toContain("left");
		expect(style.easing).toMatch(/^linear\(/);
		await expect(overview).toHaveCSS("anchor-name", "--_tab");

		const from = (await rect(overview)).x;
		const to = (await rect(settings)).x;
		await settings.click();
		const samples: number[] = [];
		for (let i = 0; i < 6; i++) {
			// Sequential on purpose: one sample every 40ms while it moves.
			// oxlint-disable-next-line no-await-in-loop
			samples.push((await rect(bar)).x);
			// oxlint-disable-next-line no-await-in-loop
			await page.waitForTimeout(40);
		}
		// Mid-flight it is somewhere between the two tabs.
		expect(samples.some((x) => x > from && x < to)).toBe(true);
		await expect.poll(() => rect(bar)).toEqual(await rect(settings));
		// The selected label reads on the fill.
		await expect(settings).toHaveCSS("color", "rgb(255, 255, 255)");
	});

	test("every variant has its own look", async ({ page }) => {
		const segmented = indicator(list(page, "segmented"));
		const pill = indicator(list(page, "pill"));
		const underline = indicator(list(page, "underline"));
		expect(await fill(segmented)).toContain("rgb(255, 255, 255)");
		expect(await fill(pill)).toContain("rgb(45, 124, 246)");
		expect((await rect(underline)).h).toBe(2);
		// Underline sits on the bottom edge of its tab.
		const home = await rect(list(page, "underline").getByRole("tab", { name: "Home" }));
		const line = await rect(underline);
		expect(line.y + line.h).toBe(home.y + home.h);
		expect(line.w).toBe(home.w);
	});

	test("expandable tabs open the selected label and fold the rest to icons", async ({ page }) => {
		const sections = list(page, "Sections");
		const home = sections.getByRole("tab", { name: "Home" });
		const inbox = sections.getByRole("tab", { name: "Inbox" });
		// Folded tabs are square, named by their (folded) label.
		const folded = await rect(inbox);
		expect(folded.w).toBe(folded.h);
		expect((await rect(home)).w).toBeGreaterThan(folded.w + 20);
		await expect(sections.locator(".rx-tabs-indicator")).toHaveCount(0);

		await inbox.click();
		await page.waitForTimeout(60);
		const mid = (await rect(inbox)).w;
		expect(mid).toBeGreaterThan(folded.w);
		await expect.poll(async () => (await rect(home)).w).toBe(folded.w);
		await expect.poll(async () => (await rect(inbox)).w).toBeGreaterThan(folded.w + 20);
		const settled = (await rect(inbox)).w;
		expect(mid).toBeLessThan(settled);
		await expect(page.getByRole("tabpanel", { name: "Inbox" })).toHaveText("Inbox goes here.");
	});

	test("sizes are 32, 40 and 48px, the height of a Button", async ({ page }) => {
		const sizes = { sm: 32, md: 40, lg: 48 };
		const measured = await Promise.all(
			Object.keys(sizes).map(async (size) => {
				const tablist = list(page, `Range, ${size}`);
				const button = tablist.locator("xpath=../..").getByRole("button", { name: "Export" });
				return [(await rect(tablist)).h, (await rect(button)).h];
			}),
		);
		expect(measured).toEqual(Object.values(sizes).map((height) => [height, height]));
	});

	test("a panel fades in as it is shown", async ({ page }) => {
		const settings = list(page, "Settings");
		await settings.getByRole("tab", { name: "Notifications" }).click();
		const panel = page.getByRole("tabpanel", { name: "Notifications" });
		const opacity = await panel.evaluate((node) => Number(getComputedStyle(node).opacity));
		expect(opacity).toBeLessThan(1);
		await expect(panel).toHaveCSS("opacity", "1");
	});

	test("controlled value follows the tabs", async ({ page }) => {
		await expect(page.getByText("Billed monthly")).toBeVisible();
		await list(page, "Billing period").getByRole("tab", { name: "Yearly" }).click();
		await expect(page.getByText("Billed yearly")).toBeVisible();
	});

	test("motion off still switches, with no glide", async ({ page }) => {
		await mode(page, "off").click();
		const project = list(page, "Project");
		const bar = indicator(project);
		await expect
			.poll(() => bar.evaluate((node) => getComputedStyle(node).transitionDuration))
			.toBe("0s");
		const activity = project.getByRole("tab", { name: "Activity" });
		await activity.click();
		expect(await rect(bar)).toEqual(await rect(activity));
	});

	test("with reduced motion the indicator jumps and nothing blurs", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const project = list(page, "Project");
		const activity = project.getByRole("tab", { name: "Activity" });
		await activity.click();
		expect(await rect(indicator(project))).toEqual(await rect(activity));
		const text = list(page, "Sections").getByRole("tab", { name: "Home" }).locator(".rx-tabs-text");
		await expect(text).toHaveCSS("filter", "none");
	});

	test("radius follows the modes: the pill squares off in Sharp", async ({ page }) => {
		const pill = list(page, "Project");
		const radius = () => pill.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(await radius()).toBe("999px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("2px");
	});
});
