/** The track. Colors, the thumb and the hit area live in `toggle.css`. */
export const toggleClass =
	"rx-toggle relative h-4 w-7 shrink-0 cursor-pointer appearance-none rounded-(--rx-r-pill) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rx-focus) disabled:cursor-not-allowed";

/** The label that wraps the track, so the whole row is clickable. */
export const toggleLabelClass =
	"inline-flex cursor-pointer items-center gap-2 text-[13px]/5 tracking-[-0.15px] text-(--rx-text) has-disabled:cursor-not-allowed has-disabled:text-(--rx-text-disabled)";
