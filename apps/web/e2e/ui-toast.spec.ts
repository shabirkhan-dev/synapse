import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
/** The Toaster that shows the default toasts (the others on the page stay empty). */
const region = (page: Page) => page.getByRole("region", { name: "Notifications (F6)" });
const toasts = (page: Page) => page.locator('.rx-toaster:popover-open [data-slot="toast"]');
const toastWith = (page: Page, text: string) => toasts(page).filter({ hasText: text });
const tint = (el: Locator) =>
	el.locator(".rx-toast-icon").evaluate((node) => getComputedStyle(node).color);
const height = (el: Locator) => el.evaluate((node) => (node as HTMLElement).offsetHeight);
const css = (el: Locator, prop: string) =>
	el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), prop);

// Clicks and pointer moves run in order, one after the other.
/* oxlint-disable no-await-in-loop */
test.describe("rabtx docs: toast", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/toast");
		await expect(page.getByRole("heading", { name: "Toast", level: 1 })).toBeVisible();
		// Hydrated: the default Toaster has claimed its region and shown its popover.
		await expect(region(page)).toHaveCount(1);
	});

	test("the region is a named manual popover in the top layer", async ({ page }) => {
		const section = region(page);
		await expect(section).toHaveAttribute("popover", "manual");
		expect(await section.evaluate((node) => node.matches(":popover-open"))).toBe(true);
		await expect(section).toHaveAttribute("tabindex", "-1");
		await expect(section.locator('[aria-live="polite"]')).toHaveCount(1);
		await expect(section.locator('[aria-live="assertive"]')).toHaveCount(1);
		// It never catches the pointer itself.
		expect(await css(section, "pointer-events")).toBe("none");
	});

	test("shows a toast with a description and an action that dismisses it", async ({ page }) => {
		await button(page, "Show toast").click();
		const created = toastWith(page, "Event created");
		await expect(created).toBeVisible();
		await expect(created).toContainText("Sunday, November 1 at 9:00");
		// Announced politely.
		await expect(region(page).locator('[aria-live="polite"]')).toContainText("Event created");
		await created.getByRole("button", { name: "Undo" }).click();
		await expect(created).toHaveCount(0);
		await expect(toastWith(page, "Event removed")).toBeVisible();
	});

	test("each type has its icon tint; errors are announced assertively", async ({ page }) => {
		await button(page, "Success").click();
		await button(page, "Error").click();
		const success = toastWith(page, "Invite sent");
		const error = toastWith(page, "Payment failed");
		await expect(success).toHaveAttribute("data-type", "success");
		await expect(error).toHaveAttribute("data-type", "error");
		expect(await tint(success)).not.toBe(await tint(error));
		await expect(region(page).locator('[aria-live="assertive"]')).toContainText("Payment failed");
		await expect(region(page).locator('[aria-live="polite"]')).not.toContainText("Payment failed");
	});

	test("stacks newest in front and fans out on hover", async ({ page }) => {
		for (const name of ["Default", "Success", "Warning"]) await button(page, name).click();
		await expect(toasts(page)).toHaveCount(3);
		const [front, middle] = [toasts(page).nth(0), toasts(page).nth(1)];
		await expect(front).toContainText("Storage almost full");
		await expect(front).toHaveAttribute("data-front", "");
		// Stacked: the one behind is smaller, higher, and as tall as the front one.
		await expect.poll(() => css(middle, "scale")).toBe("0.95");
		await expect.poll(() => css(middle, "translate")).toBe("0px -14px");
		await expect.poll(() => height(middle)).toBe(await height(front));

		const box = await front.boundingBox();
		await page.mouse.move((box?.x ?? 0) + 40, (box?.y ?? 0) + 20);
		await expect(region(page)).toHaveAttribute("data-expanded", "");
		await expect.poll(() => css(middle, "scale")).toBe("1");
		// Moving up across the gaps keeps it open.
		for (let y = (box?.y ?? 0) + 20; y > (box?.y ?? 0) - 120; y -= 6) {
			await page.mouse.move((box?.x ?? 0) + 40, y);
		}
		await expect(region(page)).toHaveAttribute("data-expanded", "");
		await page.mouse.move(10, 300);
		await expect(region(page)).not.toHaveAttribute("data-expanded");
	});

	test("shows at most three and queues the rest", async ({ page }) => {
		for (const name of ["Default", "Success", "Info", "Warning", "Error"]) {
			await button(page, name).click();
		}
		await expect(toasts(page)).toHaveCount(3);
		await button(page, "Dismiss all").click();
		await expect(toasts(page)).toHaveCount(0);
	});

	test("the timer pauses while hovered and resumes after", async ({ page }) => {
		await button(page, "Short, custom icon").click();
		const copied = toastWith(page, "Link copied");
		await expect(copied).toBeVisible();
		await copied.hover();
		await page.waitForTimeout(2200);
		await expect(copied).toBeVisible();
		await page.mouse.move(10, 300);
		await expect(copied).toHaveCount(0, { timeout: 3000 });
	});

	test("the hotkey focuses the newest toast; Escape dismisses it and hands focus on", async ({
		page,
	}) => {
		const opener = button(page, "Success");
		await button(page, "Default").click();
		await opener.click();
		await expect(toasts(page)).toHaveCount(2);
		await page.keyboard.press("Alt+T");
		await expect(toastWith(page, "Invite sent")).toBeFocused();
		await expect(region(page)).toHaveAttribute("data-expanded", "");
		await page.keyboard.press("Escape");
		await expect(toastWith(page, "Invite sent")).toHaveCount(0);
		await expect(toastWith(page, "Draft saved")).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(toasts(page)).toHaveCount(0);
		await expect(opener).toBeFocused();
	});

	test("Tab reaches the toast's buttons and the close button", async ({ page }) => {
		await button(page, "Leave call").click();
		const leave = toastWith(page, "Leave the call?");
		await page.keyboard.press("F6");
		await expect(leave).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(leave.getByRole("button", { name: "Stay" })).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(leave.getByRole("button", { name: "Leave" })).toBeFocused();
		await page.keyboard.press("Tab");
		const close = leave.getByRole("button", { name: "Dismiss" });
		await expect(close).toBeFocused();
		await expect.poll(() => css(close, "opacity")).toBe("1");
		await page.keyboard.press("Enter");
		await expect(leave).toHaveCount(0);
	});

	test("a swipe past the threshold dismisses; a short one springs back", async ({ page }) => {
		await button(page, "Persistent").click();
		const update = toastWith(page, "Update ready");
		await expect(update).toBeVisible();
		await page.waitForTimeout(400);
		const box = (await update.boundingBox())!;
		const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await page.mouse.move(start.x + 10, start.y, { steps: 3 });
		await page.mouse.move(start.x + 20, start.y, { steps: 3 });
		await expect(update).toHaveAttribute("data-swiping", "");
		expect(await css(update, "--_swipe-x")).toBe("20px");
		await page.waitForTimeout(400);
		await page.mouse.up();
		await expect(update).not.toHaveAttribute("data-swiping");
		await expect.poll(() => css(update, "translate")).toBe("0px");

		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await page.mouse.move(start.x + 120, start.y, { steps: 8 });
		await page.mouse.up();
		await expect(update).toHaveAttribute("data-swipe-out", "right");
		await expect(update).toHaveCount(0);
	});

	test("a promise turns from loading into its result", async ({ page }) => {
		await page.evaluate(() => {
			Math.random = () => 0.9;
		});
		await button(page, "Upload photos").click();
		const upload = toasts(page).first();
		await expect(upload).toHaveAttribute("data-type", "loading");
		await expect(upload).toContainText("Uploading 12 photos…");
		await expect(upload).toHaveAttribute("data-type", "success", { timeout: 4000 });
		await expect(upload).toContainText("Uploaded 12 photos");
		await expect(region(page).locator('[aria-live="polite"]')).toContainText("Uploaded 12 photos");
	});

	test("climbs back above a modal dialog that opens after it", async ({ page }) => {
		const section = region(page);
		await section.evaluate((node) => {
			(window as unknown as { hides: number }).hides = 0;
			node.addEventListener("beforetoggle", (event) => {
				if ((event as ToggleEvent).newState === "closed") {
					(window as unknown as { hides: number }).hides += 1;
				}
			});
		});
		await button(page, "Edit profile").click();
		const dialog = page.getByRole("dialog", { name: "Edit profile" });
		await expect(dialog).toBeVisible();
		await expect
			.poll(() => page.evaluate(() => (window as unknown as { hides: number }).hides))
			.toBeGreaterThan(0);
		expect(await section.evaluate((node) => node.matches(":popover-open"))).toBe(true);
		await dialog.getByRole("button", { name: "Save" }).click();
		await expect(toastWith(page, "Profile saved")).toBeVisible();
		// The dialog keeps focus and Escape still closes it.
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
	});

	test("positions place a second region on each edge", async ({ page }) => {
		await button(page, "top-left").click();
		const box = page.locator('.rx-toaster[data-y="top"][data-x="left"]:popover-open');
		await expect(box).toHaveCount(1);
		await expect(box.locator('[data-slot="toast"]')).toContainText("Toast at top left");
		const rect = (await box.boundingBox())!;
		expect(rect.y).toBeLessThan(40);
		expect(rect.x).toBeLessThan(40);
		await button(page, "bottom-center").click();
		const center = page.locator('.rx-toaster[data-y="bottom"][data-x="center"]:popover-open');
		const c = (await center.boundingBox())!;
		const width = page.viewportSize()?.width ?? 0;
		expect(Math.abs(c.x + c.width / 2 - width / 2)).toBeLessThan(2);
		// Its own name, so the page never has two regions called the same.
		await expect(page.getByRole("region", { name: "Position demo" })).toHaveCount(1);
	});

	test("motion off drops the transitions", async ({ page }) => {
		await mode(page, "off").click();
		await button(page, "Default").click();
		const toast = toastWith(page, "Draft saved");
		await expect(toast).toBeVisible();
		expect(await css(toast, "transition-duration")).toMatch(/^0s(, 0s)*$/);
		expect(await css(toast, "opacity")).toBe("1");
	});

	test("takes the full width on a phone", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 760 });
		await button(page, "Show toast").click();
		const toast = toastWith(page, "Event created");
		await expect(toast).toBeVisible();
		// Once it has settled (it enters at 0.96).
		await expect.poll(async () => Math.round((await toast.boundingBox())?.x ?? 0)).toBe(16);
		expect(Math.round((await toast.boundingBox())?.width ?? 0)).toBe(390 - 32);
	});
});
