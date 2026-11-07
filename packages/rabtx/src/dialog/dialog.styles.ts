export type DialogSize = "sm" | "md" | "lg";
/** Where the panel sits: centered, or a sheet against the right or bottom edge. */
export type DialogSide = "center" | "right" | "bottom";

export const dialogSizes = ["sm", "md", "lg"] as const satisfies readonly DialogSize[];
export const dialogSides = ["center", "right", "bottom"] as const satisfies readonly DialogSide[];

/**
 * The class list for a dialog panel. The look and the motion live in `dialog.css` (your global CSS,
 * when installed from the registry), on top of the shared surface in `control.css`, so React and
 * plain HTML get the same dialog from these names:
 *
 *   <dialog class="rx-surface rx-dialog rx-dialog-md" closedby="any">…</dialog>
 *
 * Widths are 24, 32 (default) and 42rem; a sheet ignores the size on the axis it fills.
 */
export function dialogClass({
	size = "md",
	side = "center",
}: { size?: DialogSize; side?: DialogSide } = {}) {
	return `rx-surface rx-dialog rx-dialog-${size}${side === "center" ? "" : ` rx-dialog-${side}`}`;
}

/** Class names for the parts of a Dialog, for markup written by hand. */
export const dialogParts = {
	header: "rx-dialog-header",
	title: "rx-dialog-title",
	description: "rx-dialog-description",
	footer: "rx-dialog-footer",
	/** The round button in the top corner. Its cross is drawn by CSS. */
	close: "rx-dialog-close",
} as const;

/**
 * A CSS `view-transition-name` from a React id (`«r1»` or `:r1:`), which may hold characters an
 * identifier cannot.
 */
export function morphName(id: string) {
	return `rx-dialog-${id.replace(/[^\w-]/g, "")}`;
}

/** True when the page asks for no movement: the OS setting or a `data-motion="off"` ancestor. */
export function motionOff(element: Element) {
	return (
		element.closest('[data-motion="off"]') !== null ||
		(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)
	);
}

/**
 * Whether a click on the dialog element landed on its backdrop. The backdrop belongs to the dialog,
 * so a click there targets the dialog itself, outside its box.
 */
export function onBackdrop(
	rect: { left: number; top: number; right: number; bottom: number },
	x: number,
	y: number,
) {
	return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}
