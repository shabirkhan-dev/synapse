/**
 * Class names for the settings block. Its look and motion live in `settings-block.css` (your global
 * CSS, when installed from the registry); layout inside a section is Tailwind.
 */
export const settingsParts = {
	/** The block: a size container, so the section list sits beside the panels only when it fits. */
	root: "rx-settings",
	/** The Tabs root: a column on narrow containers, a sidebar and the panels on wide ones. */
	tabs: "rx-settings-tabs",
	/** The section list. A scrolling row on narrow containers, a column on wide ones. */
	nav: "rx-settings-nav",
	/** One section panel. Its cards rise in one after another (`--_i`). */
	panel: "rx-settings-panel",
	/** A Card inside a panel. */
	section: "rx-settings-section",
	/** A row of a list of settings: the text and a control at the end, divided by rules. */
	row: "rx-settings-row",
	/** The round avatar with initials, or an image. */
	avatar: "rx-settings-avatar",
	/** A small drawing of a theme in a theme choice card. */
	swatch: "rx-settings-swatch",
	/** The density choice cards' drawing of rows. */
	density: "rx-settings-density",
	/** The danger zone card: a --destructive edge. */
	danger: "rx-settings-danger",
	/** A destructive Button: --destructive fill, or a --destructive outline with `data-tone="soft"`. */
	destructive: "rx-settings-destructive",
	/** The sticky bar that slides in while the form has unsaved changes (`:has(form[data-dirty])`). */
	bar: "rx-settings-bar",
} as const;

/** How long "Saved" shows on the bar before it slides away. */
export const SAVED_HOLD_MS = 900;
