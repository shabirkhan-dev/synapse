import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SPRINGS } from "../motion";
import { toast, toastStore } from "./toast-store";
import {
	dampSwipe,
	hotkeyLabel,
	matchesHotkey,
	splitPosition,
	stackOffsets,
	swipeDismisses,
	toasterPositions,
	toastParts,
} from "./toast.styles";
import { Toaster } from "./toaster";

const css = readFileSync(new URL("../styles/toast.css", import.meta.url), "utf8");
const list = () => toastStore.getSnapshot();
const key = (init: Partial<KeyboardEvent>) =>
	({
		key: "",
		code: "",
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		...init,
	}) as KeyboardEvent;

afterEach(() => toastStore.reset());

describe("toast()", () => {
	it("adds toasts newest first, with a type per helper, and returns their ids", () => {
		const a = toast("Saved");
		const b = toast.success("Sent", { description: "ada@example.com" });
		toast.error("Failed");
		toast.warning("Careful");
		toast.info("Heads up");
		toast.loading("Working");
		expect(list().map((t) => t.type)).toEqual([
			"loading",
			"info",
			"warning",
			"error",
			"success",
			"default",
		]);
		expect(a).not.toBe(b);
		expect(list().find((t) => t.id === b)?.description).toBe("ada@example.com");
	});

	it("updates a toast in place when given its id, and bumps its version", () => {
		const id = toast.loading("Uploading", { id: "upload" });
		expect(id).toBe("upload");
		expect(list()[0].duration).toBe(Infinity);
		toast.success("Uploaded", { id });
		expect(list()).toHaveLength(1);
		expect(list()[0]).toMatchObject({ type: "success", title: "Uploaded", version: 1 });
		// A loading toast that becomes a result gets the normal timer back.
		expect(list()[0].duration).toBeUndefined();
	});

	it("dismisses one toast or all of them, calling onDismiss once", () => {
		const onDismiss = vi.fn();
		const a = toast("One", { onDismiss });
		toast("Two");
		toast.dismiss(a);
		toast.dismiss(a);
		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(list().map((t) => Boolean(t.removing))).toEqual([false, true]);
		toast.dismiss();
		expect(list().every((t) => t.removing)).toBe(true);
		toastStore.remove(a);
		expect(list()).toHaveLength(1);
	});

	it("calls onAutoClose, not onDismiss, when the timer runs out", () => {
		const onDismiss = vi.fn();
		const onAutoClose = vi.fn();
		const id = toast("Bye", { onDismiss, onAutoClose });
		toastStore.dismiss(id, true);
		expect(onAutoClose).toHaveBeenCalledTimes(1);
		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("turns a promise into loading, then success or error", async () => {
		const ok = toast.promise(Promise.resolve(3), {
			loading: "Saving",
			success: (n) => `Saved ${n} files`,
			error: "Could not save",
		});
		expect(list()[0]).toMatchObject({ id: ok, type: "loading", title: "Saving" });
		await Promise.resolve();
		await Promise.resolve();
		expect(list()[0]).toMatchObject({ id: ok, type: "success", title: "Saved 3 files" });

		const done = vi.fn();
		const bad = toast.promise(() => Promise.reject(new Error("offline")), {
			loading: "Saving",
			success: "Saved",
			error: { title: (e) => `Failed: ${(e as Error).message}`, description: "Try again" },
			finally: done,
		});
		await new Promise((r) => setTimeout(r, 0));
		expect(list().find((t) => t.id === bad)).toMatchObject({
			type: "error",
			title: "Failed: offline",
			description: "Try again",
		});
		expect(done).toHaveBeenCalledTimes(1);
	});

	it("lets one Toaster per id claim the region until it lets go", () => {
		const first = Symbol("first");
		const second = Symbol("second");
		expect(toastStore.claim("default", first)).toBe(true);
		expect(toastStore.claim("default", second)).toBe(false);
		expect(toastStore.claim("other", second)).toBe(true);
		toastStore.release("default", first);
		expect(toastStore.claim("default", second)).toBe(true);
	});
});

describe("helpers", () => {
	it("splits a position into the y and x the CSS reads", () => {
		expect(splitPosition("bottom-right")).toEqual({ y: "bottom", x: "right" });
		expect(splitPosition("top-center")).toEqual({ y: "top", x: "center" });
		expect(toasterPositions).toHaveLength(6);
	});

	it("fans toasts out by the heights in front of them plus a gap each", () => {
		expect(stackOffsets([56, 76, 56], 14)).toEqual([0, 70, 160]);
		expect(stackOffsets([], 14)).toEqual([]);
	});

	it("dismisses a swipe past the threshold or thrown fast enough", () => {
		expect(swipeDismisses(50, 1000)).toBe(true);
		expect(swipeDismisses(20, 1000)).toBe(false);
		expect(swipeDismisses(-30, 100)).toBe(true);
	});

	it("resists a swipe away from the toast's edge", () => {
		expect(dampSwipe(40, 1)).toBe(40);
		expect(dampSwipe(-16, 1)).toBe(-6);
		expect(Math.abs(dampSwipe(-100, 1))).toBeLessThan(20);
		expect(dampSwipe(-16, -1)).toBe(-16);
	});

	it("matches hotkeys by key or code, with exact modifiers", () => {
		expect(matchesHotkey(key({ key: "F6", code: "F6" }), "F6")).toBe(true);
		expect(matchesHotkey(key({ key: "F6", code: "F6", shiftKey: true }), "F6")).toBe(false);
		// Alt+T types † on a Mac, so the code matches too.
		expect(matchesHotkey(key({ key: "†", code: "KeyT", altKey: true }), "Alt+T")).toBe(true);
		expect(matchesHotkey(key({ key: "t", code: "KeyT" }), "Alt+T")).toBe(false);
		expect(hotkeyLabel("Alt+T")).toBe("Alt T");
	});
});

describe("Toaster markup", () => {
	it("is a named, manual popover region with polite and assertive live regions", () => {
		const html = renderToStaticMarkup(<Toaster position="top-center" />);
		expect(html).toContain('popover="manual"');
		expect(html).toContain('aria-label="Notifications (F6)"');
		expect(html).toContain('data-y="top"');
		expect(html).toContain('data-x="center"');
		expect(html).toContain('aria-live="polite"');
		expect(html).toContain('aria-live="assertive"');
		expect(html).toMatch(/^<section[^>]*tabindex="-1"/);
	});

	it("renders no toasts on the server", () => {
		toast("Hello");
		expect(renderToStaticMarkup(<Toaster />)).not.toContain("rx-toast-body");
	});

	it("takes a label and hotkeys", () => {
		const html = renderToStaticMarkup(<Toaster label="Alerts" hotkey={["Alt+N"]} />);
		expect(html).toContain('aria-label="Alerts (Alt N)"');
		expect(renderToStaticMarkup(<Toaster hotkey={[]} />)).toContain('aria-label="Notifications"');
	});
});

describe("toast.css", () => {
	it("has a rule for every part", () => {
		for (const name of Object.values(toastParts)) {
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
		}
	});

	it("resets the popover box and keeps the region out of the pointer's way", () => {
		expect(css).toMatch(/\.rx-toaster \{[^}]*inset: auto;[^}]*pointer-events: none;/);
		expect(css).toContain("overflow: visible;");
	});

	it("enters from @starting-style on the toast spring and leaves with display allow-discrete", () => {
		expect(SPRINGS.toast).toEqual({ stiffness: 420, damping: 34, mass: 0.75 });
		expect(css).toContain("@starting-style");
		expect(css).toContain("var(--spring-toast)");
		expect(css).toContain("display 200ms allow-discrete");
		expect(css).toContain("filter: blur(10px)");
	});

	it("stacks with the measured heights and fans out on data-expanded", () => {
		expect(css).toContain("--_y: calc(var(--_dir) * var(--_i, 0) * var(--_peek));");
		expect(css).toContain("--_scale: calc(1 - var(--_i, 0) * 0.05);");
		expect(css).toContain(".rx-toaster[data-expanded] .rx-toast {");
		expect(css).toContain("height: var(--_front-h, auto);");
	});

	it("follows the swipe variables and flies out the way it was thrown", () => {
		expect(css).toContain("calc(var(--_swipe-x) + var(--_exit-x))");
		for (const side of ["right", "left", "down", "up"]) {
			expect(css).toContain(`.rx-toast[data-removed][data-swipe-out="${side}"]`);
		}
	});

	it("tints icons with the status tokens", () => {
		for (const token of ["--success", "--warning", "--destructive", "--primary"]) {
			expect(css).toContain(`--_tone: var(${token});`);
		}
	});

	it("keeps motion preferences in rx-motion and casts no shadow", () => {
		const motion = css.slice(css.indexOf("@layer rx-motion"));
		expect(motion).toContain("@media (prefers-reduced-motion: reduce)");
		expect(motion).toContain('[data-motion="off"]');
		expect(css.slice(0, css.indexOf("@layer rx-motion"))).not.toContain("prefers-reduced-motion");
		expect(css).not.toMatch(/box-shadow|--shadow-|!important/);
	});
});
