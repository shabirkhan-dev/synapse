export type AccordionVariant = "separated" | "cards" | "flush";
export type AccordionType = "single" | "multiple";

export const accordionVariants = [
	"separated",
	"cards",
	"flush",
] as const satisfies readonly AccordionVariant[];

/**
 * The class list for an accordion. The look and the motion live in `accordion.css` on top of
 * `collapsible.css` (your global CSS, when installed from the registry): every item is a
 * Collapsible, a `<details>`. Single accordions give the items one `name`, so the browser keeps one
 * open even before hydration:
 *
 *   <div class="rx-accordion rx-accordion-separated">
 *     <details class="rx-collapsible rx-accordion-item" name="faq" open>
 *       <summary class="rx-collapsible-trigger rx-accordion-trigger">
 *         <span class="rx-accordion-title">Is it accessible?</span>
 *         <span class="rx-collapsible-chevron" aria-hidden="true"></span>
 *       </summary>
 *       <div class="rx-collapsible-content rx-accordion-content" role="region">…</div>
 *     </details>
 *   </div>
 */
export function accordionClass(variant: AccordionVariant = "separated") {
	return `rx-accordion rx-accordion-${variant}`;
}

/** Class names for the parts of Accordion (each item also carries the Collapsible's). */
export const accordionParts = {
	root: "rx-accordion",
	/** One `<details>`. */
	item: "rx-accordion-item",
	/** Its `<summary>`. */
	trigger: "rx-accordion-trigger",
	/** A decorative icon before the title. */
	icon: "rx-accordion-icon",
	/** The title text. */
	title: "rx-accordion-title",
	/** The panel, a `region` named by its trigger. */
	content: "rx-accordion-content",
} as const;
