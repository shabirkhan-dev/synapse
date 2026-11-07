export type TooltipSide = "top" | "right" | "bottom" | "left";
export type TooltipAlign = "start" | "center" | "end";

export const tooltipSides = [
	"top",
	"right",
	"bottom",
	"left",
] as const satisfies readonly TooltipSide[];
export const tooltipAligns = ["start", "center", "end"] as const satisfies readonly TooltipAlign[];

/**
 * The class list for a tooltip. The look, the placement and the motion live in `tooltip.css`
 * (your global CSS, when installed from the registry), so plain HTML gets the same tooltip from
 * these names. The placement is CSS anchor positioning: the trigger names an anchor, the tooltip
 * points `position-anchor` at it and `data-side` / `data-align` pick the `position-area`:
 *
 *   <button interestfor="tip" style="anchor-name: --tip">Save</button>
 *   <span id="tip" popover="hint" role="tooltip" class="rx-tooltip"
 *     data-side="top" data-align="center" style="position-anchor: --tip">Save the draft</span>
 */
export function tooltipClass() {
	return "rx-tooltip";
}

/** Class names for the parts of a tooltip, for markup written by hand. */
export const tooltipParts = {
	/** The pointer at the trigger: a small rotated square, oriented by `data-placed`. */
	arrow: "rx-tooltip-arrow",
	/** A keyboard shortcut inside the label, such as ⌘B. */
	kbd: "rx-tooltip-kbd",
} as const;

/** A CSS anchor name from a React id (`«r1»`, `:r1:` or `_r_1_`), which may hold any character. */
export function anchorName(id: string) {
	return `--_tooltip-${id.replace(/[^\w-]/g, "")}`;
}

type Box = { left: number; top: number; right: number; bottom: number };

/**
 * The side the tooltip actually ended up on. CSS may have flipped it (`position-try-fallbacks`)
 * when the preferred side had no room, and CSS does not say which fallback it chose, so the
 * component reads it from the two boxes once the tooltip is shown. The arrow and the
 * `transform-origin` follow it.
 */
export function placedSide(trigger: Box, content: Box, preferred: TooltipSide): TooltipSide {
	const triggerX = (trigger.left + trigger.right) / 2;
	const triggerY = (trigger.top + trigger.bottom) / 2;
	const contentX = (content.left + content.right) / 2;
	const contentY = (content.top + content.bottom) / 2;
	if (preferred === "top" || preferred === "bottom") return contentY < triggerY ? "top" : "bottom";
	return contentX < triggerX ? "left" : "right";
}

/**
 * Where the arrow sits along the tooltip's edge, in px from its start (left or top): under the
 * trigger's center, kept clear of the rounded corners.
 */
export function arrowOffset(
	trigger: Box,
	content: Box,
	side: TooltipSide,
	{ arrow = 10, inset = 8 }: { arrow?: number; inset?: number } = {},
) {
	const vertical = side === "top" || side === "bottom";
	const center = vertical ? (trigger.left + trigger.right) / 2 : (trigger.top + trigger.bottom) / 2;
	const start = vertical ? content.left : content.top;
	const length = vertical ? content.right - content.left : content.bottom - content.top;
	const at = center - start - arrow / 2;
	return Math.round(Math.max(inset, Math.min(at, length - inset - arrow)));
}

/**
 * Placement where CSS anchor positioning is missing (Firefox below 147, Safari below 26): the same
 * side, alignment and offset, flipped to the other side when it does not fit and kept `margin`
 * inside the viewport. Returns the viewport coordinates of the tooltip's top left corner.
 */
export function fallbackPosition(
	trigger: Box,
	size: { width: number; height: number },
	viewport: { width: number; height: number },
	{
		side,
		align,
		offset,
		margin = 8,
	}: { side: TooltipSide; align: TooltipAlign; offset: number; margin?: number },
): { x: number; y: number; side: TooltipSide } {
	const fits: Record<TooltipSide, boolean> = {
		top: trigger.top - offset - size.height >= margin,
		bottom: trigger.bottom + offset + size.height <= viewport.height - margin,
		left: trigger.left - offset - size.width >= margin,
		right: trigger.right + offset + size.width <= viewport.width - margin,
	};
	const opposite: Record<TooltipSide, TooltipSide> = {
		top: "bottom",
		bottom: "top",
		left: "right",
		right: "left",
	};
	const placed = fits[side] || !fits[opposite[side]] ? side : opposite[side];
	const vertical = placed === "top" || placed === "bottom";
	const along = (start: number, end: number, extent: number) =>
		align === "start" ? start : align === "end" ? end - extent : (start + end - extent) / 2;
	const clamp = (value: number, extent: number, room: number) =>
		Math.max(margin, Math.min(value, room - margin - extent));
	const x = vertical
		? clamp(along(trigger.left, trigger.right, size.width), size.width, viewport.width)
		: placed === "left"
			? trigger.left - offset - size.width
			: trigger.right + offset;
	const y = vertical
		? placed === "top"
			? trigger.top - offset - size.height
			: trigger.bottom + offset
		: clamp(along(trigger.top, trigger.bottom, size.height), size.height, viewport.height);
	return { x: Math.round(x), y: Math.round(y), side: placed };
}
