export type CardSize = "sm" | "default" | "lg";

export const cardSizes = ["sm", "default", "lg"] as const satisfies readonly CardSize[];

/**
 * The class list for a Card. The look lives in `card.css` (your global CSS, when installed from the
 * registry) on top of the shared surface in `control.css`, so React, Solid and plain HTML all get the
 * same card from these names:
 *
 *   <div class="rx-surface rx-card"><div class="rx-card-header">...</div></div>
 *
 * Padding is 12, 16 or 20px including the 1px edge (Figma's Kanban, Option and Stat cards).
 */
export function cardClass(size: CardSize = "default") {
	return `rx-surface rx-card${size === "default" ? "" : ` rx-card-${size}`}`;
}

/** Class names for the parts of a Card and its animated variants, for markup written by hand. */
export const cardParts = {
	header: "rx-card-header",
	title: "rx-card-title",
	description: "rx-card-description",
	action: "rx-card-action",
	content: "rx-card-content",
	footer: "rx-card-footer",
	/**
	 * Put it on the one link, button or label that owns the card: its hit area stretches over the
	 * whole card, the card gets hover, press and focus feedback, and a checked input inside it marks
	 * the card selected. Other controls in the card stay on top and keep working.
	 */
	target: "rx-card-target",
	/** TiltCard: leans toward the pointer in 3D, with a glare that follows it. */
	tilt: "rx-card-tilt",
	/** SpotlightCard: a soft light and a lit edge follow the pointer. */
	spotlight: "rx-card-spotlight",
	/** ExpandableCard: a `<details>` card whose content grows open. */
	expandable: "rx-card-expandable",
	summary: "rx-card-summary",
	chevron: "rx-card-chevron",
	/** CardStack: cards piled behind the first that spread into a list. */
	stack: "rx-card-stack",
	stackList: "rx-card-stack-list",
	stackItem: "rx-card-stack-item",
	stackToggle: "rx-card-stack-toggle",
} as const;
