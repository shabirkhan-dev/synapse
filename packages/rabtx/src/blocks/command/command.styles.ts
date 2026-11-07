/**
 * Class names for the command block. Its look and motion live in `command-block.css` (your global
 * CSS, when installed from the registry); the field, badges, buttons and tabs are the components'.
 */
export const commandParts = {
	/** The panel: field, scopes, list and footer in a column. */
	root: "rx-command",
	/** Added to the root when it stands alone (not in the dialog): the raised popover surface. */
	surface: "rx-command-surface",
	/** The Dialog panel holding a palette: narrower, higher up, no padding of its own. */
	dialog: "rx-command-dialog",
	/** The search field's row. */
	search: "rx-command-search",
	/** The pages above the current one, with a back button. */
	crumbs: "rx-command-crumbs",
	/** The scope tabs' row. */
	scopes: "rx-command-scopes",
	/** Scrolls the list and eases its height to the content's (`--_h`, measured in script). */
	viewport: "rx-command-viewport",
	/** The `listbox`. Scopes the highlight's anchor, so two palettes never share one. */
	list: "rx-command-list",
	/** A `group` of options under a heading. */
	group: "rx-command-group",
	heading: "rx-command-heading",
	/** One `option`. `data-active` on the one the arrow keys are on: it becomes the anchor. */
	item: "rx-command-item",
	itemIcon: "rx-command-item-icon",
	itemText: "rx-command-item-text",
	itemLabel: "rx-command-item-label",
	itemDescription: "rx-command-item-description",
	/** The arrow on an option that opens a page. */
	itemChevron: "rx-command-item-chevron",
	/** The matched letters in a label. */
	match: "rx-command-match",
	/** The list's last child: the highlight that slides to the anchored option. */
	highlight: "rx-command-highlight",
	/** A key cap, such as ⌘ or K. */
	kbd: "rx-command-kbd",
	/** Turns in the field while more results load. */
	spinner: "rx-command-spinner",
	/** Placeholder rows while commands load. */
	skeleton: "rx-command-skeleton",
	/** The message when nothing matches, or a page failed to load. */
	empty: "rx-command-empty",
	/** The keyboard hints along the bottom. */
	footer: "rx-command-footer",
	/** The trigger button's key caps. */
	trigger: "rx-command-trigger",
} as const;

/** How many placeholder rows the loading state shows. */
export const SKELETON_ROWS = 4;
