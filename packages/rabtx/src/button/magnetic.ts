/**
 * How far a magnetic button leans toward the pointer: the pointer's distance from the button's
 * centre, scaled by `strength`. 0 stays put, 1 would put the centre under the pointer.
 */
export function magneticOffset(
	rect: { left: number; top: number; width: number; height: number },
	clientX: number,
	clientY: number,
	strength: number,
) {
	return {
		x: (clientX - (rect.left + rect.width / 2)) * strength,
		y: (clientY - (rect.top + rect.height / 2)) * strength,
	};
}
