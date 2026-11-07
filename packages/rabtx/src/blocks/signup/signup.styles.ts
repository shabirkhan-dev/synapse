/**
 * Class names for the sign-up and sign-in blocks. Their look and motion live in `signup-block.css`
 * (your global CSS, when installed from the registry); layout inside a step is Tailwind.
 */
export const signupParts = {
	/** The block's card. `data-moved` turns on step transitions after the first step change. */
	root: "rx-signup",
	/** The step indicator: an `<ol>` whose track fills to `--_progress` (0 to 1). */
	progress: "rx-signup-progress",
	/** One step: `data-state="complete" | "current" | "upcoming"`. */
	progressStep: "rx-signup-progress-step",
	progressDot: "rx-signup-progress-dot",
	progressLabel: "rx-signup-progress-label",
	/** Holds the steps in one grid cell and eases its height to the current step's (`--_h`). */
	viewport: "rx-signup-viewport",
	/** One step. Enters from `--_dir` (1 forward, -1 back); `data-leaving` plays its exit. */
	panel: "rx-signup-panel",
	/** A step's heading, focused when the step opens. */
	heading: "rx-signup-heading",
	/** The password strength meter: four bars, `data-score` 0 to 4. */
	strength: "rx-signup-strength",
	strengthBar: "rx-signup-strength-bar",
	/** The drawn tick on the last step. */
	doneMark: "rx-signup-done-mark",
	/** A rule with a word in the middle, such as "or". */
	divider: "rx-signup-divider",
} as const;

/** How long a leaving step stays in the DOM: its exit animation, plus a frame. */
export const STEP_EXIT_MS = 240;
