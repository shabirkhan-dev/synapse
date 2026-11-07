import type { ToastType } from "./toast-store";

export type ToasterPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export const toasterPositions = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
] as const satisfies readonly ToasterPosition[];

export const toastTypes = [
	"default",
	"success",
	"error",
	"warning",
	"info",
	"loading",
] as const satisfies readonly ToastType[];

/**
 * Class names for a toaster and its toasts. The look and the motion live in `toast.css` (your
 * global CSS, when installed from the registry). The Toaster sets these as data attributes and CSS
 * variables; markup written by hand can use the same names:
 *
 *   <section popover="manual" class="rx-toaster" data-y="bottom" data-x="right">
 *     <ol class="rx-toaster-list"><li class="rx-surface rx-toast" data-type="success">…</li></ol>
 *   </section>
 */
export const toastParts = {
	toaster: "rx-toaster",
	list: "rx-toaster-list",
	toast: "rx-toast",
	/** The inner box. It is measured, so a collapsed toast can clip it to the front one's height. */
	body: "rx-toast-body",
	icon: "rx-toast-icon",
	content: "rx-toast-content",
	title: "rx-toast-title",
	description: "rx-toast-description",
	actions: "rx-toast-actions",
	/** The round button in the corner. Its cross is drawn by CSS. */
	close: "rx-toast-close",
	/** Screen reader announcements, polite and assertive. */
	announcer: "rx-toast-announcer",
} as const;

/** The two halves of a position, as the `data-y` and `data-x` the CSS reads. */
export function splitPosition(position: ToasterPosition) {
	const [y, x] = position.split("-") as ["top" | "bottom", "left" | "center" | "right"];
	return { y, x };
}

/**
 * Where each toast sits when the stack is fanned out: the heights of the toasts in front of it plus
 * a gap for each. Index 0 is the front (newest) toast.
 */
export function stackOffsets(heights: readonly number[], gap: number): number[] {
	const out: number[] = [];
	let sum = 0;
	for (const [index, height] of heights.entries()) {
		out.push(sum + index * gap);
		sum += height;
	}
	return out;
}

/** Whether a swipe has gone far or fast enough to dismiss. Distance in px, time in ms. */
export function swipeDismisses(distance: number, ms: number, threshold = 45) {
	const velocity = Math.abs(distance) / Math.max(ms, 1);
	return Math.abs(distance) >= threshold || velocity > 0.11;
}

/**
 * A swipe moves freely toward the toast's own edge and resists the other way, so the toast follows
 * the finger but cannot be thrown into the page. `toward` is +1 or -1, the direction that dismisses.
 */
export function dampSwipe(delta: number, toward: 1 | -1) {
	if (Math.sign(delta) === toward || delta === 0) return delta;
	return -toward * Math.sqrt(Math.abs(delta)) * 1.5;
}

/** Whether a key event matches a hotkey such as `"F6"`, `"Alt+T"` or `"Mod+Shift+K"`. */
export function matchesHotkey(
	event: Pick<KeyboardEvent, "key" | "code" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey">,
	hotkey: string,
) {
	const parts = hotkey.split("+").map((part) => part.trim().toLowerCase());
	const key = parts.pop() ?? "";
	const want = new Set(parts);
	const mod = want.delete("mod");
	const isMac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);
	const needs = {
		alt: want.has("alt"),
		ctrl: want.has("ctrl") || (mod && !isMac),
		meta: want.has("meta") || (mod && isMac),
		shift: want.has("shift"),
	};
	if (
		event.altKey !== needs.alt ||
		event.ctrlKey !== needs.ctrl ||
		event.metaKey !== needs.meta ||
		event.shiftKey !== needs.shift
	) {
		return false;
	}
	// Alt changes `key` on a Mac (Alt+T types †), so letters and digits also match on `code`.
	const code = event.code.toLowerCase();
	return (
		event.key.toLowerCase() === key ||
		code === key ||
		code === `key${key}` ||
		code === `digit${key}`
	);
}

/** The readable form of a hotkey for a label: `"Alt+T"` becomes `"Alt T"`. */
export function hotkeyLabel(hotkey: string) {
	return hotkey.split("+").join(" ");
}
