import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("header label", { hasText: new RegExp(`^${name}$`, "i") });

/** The live example rendered from `_examples/<file>.tsx`, found by its own source. */
const example = (page: Page, fn: string) =>
	page
		.locator("figure")
		.filter({ hasText: `export default function ${fn}()` })
		.locator("> div")
		.first();
const item = (scope: Locator, title: string) =>
	scope.locator("details.rx-accordion-item", {
		has: scope.page().locator("summary", { hasText: title }),
	});
const trigger = (scope: Locator, title: string) => item(scope, title).locator("> summary");
const isOpen = (details: Locator) => details.evaluate((node) => (node as HTMLDetailsElement).open);
const openTitles = (scope: Locator) =>
	scope.locator("details.rx-accordion-item[open] > summary .rx-accordion-title").allTextContents();

test.describe("rabtx docs: accordion", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/accordion");
		await expect(page.getByRole("heading", { name: "Accordion", level: 1 })).toBeVisible();
	});

	test("items are details with a summary trigger and a named region", async ({ page }) => {
		const releases = example(page, "AccordionDefault");
		const items = releases.locator("details.rx-accordion-item");
		await expect(items).toHaveCount(6);
		// A single accordion is one `name` group, so the browser keeps one open by itself.
		const names = await items.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("name")));
		expect(new Set(names).size).toBe(1);
		expect(names[0]).toBeTruthy();
		await expect(trigger(releases, "Rollout calendar")).toHaveCSS("display", "flex");

		const region = releases.getByRole("region", { name: "Rollout calendar" });
		await expect(region).toBeVisible();
		await expect(region).toHaveText(/Announcements, staging checks/);
		// Closed content is hidden from everyone.
		await expect(releases.getByRole("region", { name: "Release brief" })).toHaveCount(0);
		await expect(releases.getByText("Launch notes, owners and risks")).toBeHidden();
	});

	test("single: opening one closes the other; collapsible closes the open one", async ({
		page,
	}) => {
		const releases = example(page, "AccordionDefault");
		expect(await openTitles(releases)).toEqual(["Rollout calendar"]);
		await trigger(releases, "Ship the build").click();
		await expect.poll(() => openTitles(releases)).toEqual(["Ship the build"]);
		await expect(releases.getByText("The current artifact")).toBeVisible();
		await trigger(releases, "Ship the build").click();
		await expect.poll(() => openTitles(releases)).toEqual([]);
	});

	test("single, not collapsible: the open item stays open and says so", async ({ page }) => {
		const states = example(page, "AccordionStates");
		const profile = trigger(states, "Profile");
		await expect(profile).toHaveAttribute("aria-disabled", "true");
		await profile.click();
		expect(await isOpen(item(states, "Profile"))).toBe(true);
		await trigger(states, "Security").click();
		await expect.poll(() => openTitles(states)).toEqual(["Security"]);
		await expect(trigger(states, "Security")).toHaveAttribute("aria-disabled", "true");
		await expect(profile).not.toHaveAttribute("aria-disabled");
	});

	test("a disabled item does not open, and leaves the Tab order", async ({ page }) => {
		const states = example(page, "AccordionStates");
		const billing = trigger(states, "Billing");
		await expect(billing).toHaveAttribute("aria-disabled", "true");
		await expect(billing).toHaveAttribute("tabindex", "-1");
		await expect(billing).toHaveCSS("opacity", "0.5");
		await billing.click({ force: true });
		expect(await isOpen(item(states, "Billing"))).toBe(false);
	});

	test("multiple: items open and close on their own", async ({ page }) => {
		const faq = example(page, "AccordionMultiple");
		expect(await openTitles(faq)).toEqual([
			"Can I change plans later?",
			"Where is my data stored?",
		]);
		await trigger(faq, "Do you offer refunds?").click();
		await expect.poll(() => openTitles(faq)).toHaveLength(3);
		await trigger(faq, "Can I change plans later?").click();
		await expect
			.poll(() => openTitles(faq))
			.toEqual(["Do you offer refunds?", "Where is my data stored?"]);
		const names = await faq
			.locator("details.rx-accordion-item")
			.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("name")));
		expect(names).toEqual([null, null, null]);
	});

	test("keyboard: arrows, Home and End move between triggers; Enter and Space toggle", async ({
		page,
	}) => {
		const states = example(page, "AccordionStates");
		const profile = trigger(states, "Profile");
		const security = trigger(states, "Security");
		await profile.focus();
		await expect(profile).toHaveCSS("outline-width", "2px");
		// The disabled item is skipped, and the arrows wrap.
		await page.keyboard.press("ArrowDown");
		await expect(security).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await expect(profile).toBeFocused();
		await page.keyboard.press("ArrowUp");
		await expect(security).toBeFocused();
		await page.keyboard.press("Home");
		await expect(profile).toBeFocused();
		await page.keyboard.press("End");
		await expect(security).toBeFocused();

		await page.keyboard.press("Enter");
		await expect.poll(() => openTitles(states)).toEqual(["Security"]);
		await page.keyboard.press("ArrowUp");
		await expect(profile).toBeFocused();
		await page.keyboard.press("Space");
		await expect.poll(() => openTitles(states)).toEqual(["Profile"]);

		const releases = example(page, "AccordionDefault");
		await trigger(releases, "Rollout calendar").focus();
		await page.keyboard.press("Enter");
		await expect.poll(() => openTitles(releases)).toEqual([]);
		await page.keyboard.press(" ");
		await expect.poll(() => openTitles(releases)).toEqual(["Rollout calendar"]);
		// Tab goes on to the next trigger; closed content holds no focus stops.
		await page.keyboard.press("Tab");
		await expect(trigger(releases, "Ship the build")).toBeFocused();
	});

	test("controlled: the value drives the items, and a press reports back", async ({ page }) => {
		const controlled = example(page, "AccordionControlled");
		const status = controlled.getByText(/^Open: /);
		await expect(status).toHaveText("Open: plans");
		await controlled.getByRole("button", { name: "data", exact: true }).click();
		await expect.poll(() => openTitles(controlled)).toEqual(["Where is my data stored?"]);
		await controlled.getByRole("button", { name: "Close all" }).click();
		await expect.poll(() => openTitles(controlled)).toEqual([]);
		await expect(status).toHaveText("Open: none");
		await trigger(controlled, "Do you offer refunds?").click();
		await expect(status).toHaveText("Open: refunds");
	});

	test("the height springs open past its size and settles; content rises out of a blur", async ({
		page,
	}) => {
		const releases = example(page, "AccordionDefault");
		const brief = item(releases, "Release brief");
		await brief.scrollIntoViewIfNeeded();
		const samples = await brief.evaluate(async (node) => {
			const summary = node.querySelector("summary") as HTMLElement;
			const content = node.querySelector(".rx-accordion-content") as HTMLElement;
			const closed = node.getBoundingClientRect().height;
			const rows: { h: number; blur: string; margin: number }[] = [];
			summary.click();
			const start = performance.now();
			await new Promise<void>((done) => {
				const tick = () => {
					rows.push({
						h: node.getBoundingClientRect().height,
						blur: getComputedStyle(content).filter,
						margin: parseFloat(getComputedStyle(node.nextElementSibling as Element).marginTop),
					});
					if (performance.now() - start < 1100) requestAnimationFrame(tick);
					else done();
				};
				requestAnimationFrame(tick);
			});
			return { closed, rows };
		});
		const heights = samples.rows.map((row) => row.h);
		const final = heights[heights.length - 1];
		const peak = Math.max(...heights);
		// Some frame sits part way, the peak overshoots the final height, and it settles there.
		expect(heights.some((h) => h > samples.closed + 5 && h < final - 5)).toBe(true);
		expect(peak).toBeGreaterThan(final + 0.5);
		expect(samples.rows.some((row) => row.blur !== "none" && row.blur !== "blur(0px)")).toBe(true);
		expect(samples.rows[samples.rows.length - 1].blur).toMatch(/^(none|blur\(0px\))$/);
		// The next row lifts away from the open one: its margin goes from the -1px seam to the gap.
		expect(samples.rows.some((row) => row.margin > 0 && row.margin < 11)).toBe(true);
		expect(samples.rows[samples.rows.length - 1].margin).toBeCloseTo(12, 0);
	});

	test("separated: the open item lifts out and its neighbours round their facing corners", async ({
		page,
	}) => {
		const releases = example(page, "AccordionDefault");
		const before = item(releases, "Campaign notes");
		const open = item(releases, "Rollout calendar");
		const after = item(releases, "Ship the build");
		const joined = item(releases, "Launch checklist");
		await expect(open).toHaveCSS("border-top-left-radius", "12px");
		await expect(open).toHaveCSS("border-bottom-left-radius", "12px");
		await expect(before).toHaveCSS("border-bottom-left-radius", "12px");
		await expect(after).toHaveCSS("border-top-left-radius", "12px");
		await expect(after).toHaveCSS("margin-top", "12px");
		await expect(joined).toHaveCSS("border-top-left-radius", "0px");
		await expect(joined).toHaveCSS("margin-top", "-1px");
	});

	test("motion off opens at once", async ({ page }) => {
		await mode(page, "off").click();
		const releases = example(page, "AccordionDefault");
		const brief = item(releases, "Release brief");
		const result = await brief.evaluate(async (node) => {
			(node.querySelector("summary") as HTMLElement).click();
			await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
			const h = node.getBoundingClientRect().height;
			await new Promise((r) => setTimeout(r, 900));
			return [h, node.getBoundingClientRect().height];
		});
		expect(result[0]).toBeCloseTo(result[1], 0);
	});

	test("radius and depth modes reach the items", async ({ page }) => {
		const releases = example(page, "AccordionDefault");
		const open = item(releases, "Rollout calendar");
		await mode(page, "sharp").click();
		await expect(open).toHaveCSS("border-top-left-radius", "4px");
		await mode(page, "round").click();
		await expect(open).toHaveCSS("border-top-left-radius", "20px");
		await mode(page, "flat").click();
		await expect(open).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0) 0px 0px 0px 1px");
	});
});

test.describe("rabtx docs: accordion find in page", () => {
	test("a link to an id inside a closed item opens it, and the accordion follows", async ({
		page,
	}) => {
		await page.goto("/ui/accordion#returns-window");
		const find = example(page, "AccordionFind");
		await expect(find.getByText("Send it back within thirty days")).toBeVisible();
		await expect.poll(() => openTitles(find)).toEqual(["Returns"]);
		// After hydration it is the accordion's state: pressing another trigger moves it on.
		await trigger(find, "Warranty").click();
		await expect.poll(() => openTitles(find)).toEqual(["Warranty"]);
	});

	test("a same-page link into a closed item opens it after hydration", async ({ page }) => {
		await page.goto("/ui/accordion");
		const find = example(page, "AccordionFind");
		await expect.poll(() => openTitles(find)).toEqual(["Shipping"]);
		await page.getByRole("link", { name: "#returns-window" }).click();
		await expect.poll(() => openTitles(find)).toEqual(["Returns"]);
		await expect(find.getByText("Send it back within thirty days")).toBeVisible();
	});

	test("a text fragment opens the item that holds the text", async ({ page }) => {
		await page.goto("/ui/accordion#:~:text=Two%20years%20on%20parts");
		const find = example(page, "AccordionFind");
		await expect.poll(() => openTitles(find)).toEqual(["Warranty"]);
	});
});

test.describe("rabtx docs: collapsible", () => {
	test("toggles with the trigger, and a controlled one reports its state", async ({ page }) => {
		await page.goto("/ui/accordion");
		const plain = example(page, "CollapsibleDefault");
		const details = plain.locator("details.rx-collapsible");
		await expect(plain.getByText("Keep extra information")).toBeHidden();
		await plain.locator("summary", { hasText: "More details" }).click();
		await expect(plain.getByText("Keep extra information")).toBeVisible();
		await expect(details).toHaveAttribute("data-state", "open");
		await expect(plain.locator(".rx-collapsible-chevron")).toHaveCSS("rotate", "180deg");

		const controlled = example(page, "CollapsibleControlled");
		const summary = controlled.locator("summary");
		await expect(summary).toContainText("Show 3");
		await summary.focus();
		await page.keyboard.press("Enter");
		await expect(summary).toContainText("Hide");
		await expect(controlled.getByText("Open", { exact: true })).toBeVisible();
		await expect(controlled.getByText("rabtx/docs")).toBeVisible();
		await page.keyboard.press("Space");
		await expect(controlled.getByText("Closed", { exact: true })).toBeVisible();
	});
});
