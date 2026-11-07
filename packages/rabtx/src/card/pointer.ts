/** Where the pointer is over a box, from 0 (left or top edge) to 1 (right or bottom edge). */
export function pointerRatio(
	rect: { left: number; top: number; width: number; height: number },
	clientX: number,
	clientY: number,
) {
	return {
		x: rect.width ? clamp((clientX - rect.left) / rect.width) : 0.5,
		y: rect.height ? clamp((clientY - rect.top) / rect.height) : 0.5,
	};
}

/**
 * How far a TiltCard turns, in degrees, so the side under the pointer dips toward it. The centre is
 * flat; an edge turns by half of `max`, a corner on both axes.
 */
export function tiltAngles(ratio: { x: number; y: number }, max: number) {
	return { x: round((0.5 - ratio.y) * max), y: round((ratio.x - 0.5) * max) };
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Math.round(value * 100) / 100 || 0;

/** Writes the pointer's position over the element as `--_px` / `--_py` percentages. */
export function setPointerVars(node: HTMLElement, ratio: { x: number; y: number }) {
	node.style.setProperty("--_px", `${round(ratio.x * 100)}%`);
	node.style.setProperty("--_py", `${round(ratio.y * 100)}%`);
}
