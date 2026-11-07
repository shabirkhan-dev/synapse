"use client";

import {
	Children,
	isValidElement,
	type CSSProperties,
	type HTMLAttributes,
	type ReactNode,
	useId,
	useState,
} from "react";
import { cardParts } from "./card.styles";
import { cn } from "../lib/utils";

export type CardStackProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
	/** The cards, newest first. Each child becomes a list item. */
	children: ReactNode;
	/** What the cards are, for the toggle ("Show all 4 notifications"). Default "cards". */
	noun?: string;
	/** How many cards peek out behind the first while collapsed. Default 2. */
	peek?: number;
	/** Controlled state. Pair with `onExpandedChange`. */
	expanded?: boolean;
	defaultExpanded?: boolean;
	onExpandedChange?: (expanded: boolean) => void;
	/** The toggle's text. Defaults to "Show all N {noun}" and "Show less". */
	showLabel?: string;
	hideLabel?: string;
};

/**
 * Cards piled behind the first, each a little smaller, that spread into a list. The toggle is a
 * real button with `aria-expanded`; while collapsed its hit area covers the whole pile, so a click
 * or tap anywhere on it opens the list. The cards behind are `inert` while collapsed, so neither
 * Tab nor a screen reader lands on what you cannot see. Keep links and buttons out of the first
 * card, or they sit under the toggle until the stack is open.
 *
 * The motion is CSS: each item's height animates between its peek and `auto` with
 * `interpolate-size`, and the cards scale back to full size, on the panel spring. Cards of similar
 * height stack best.
 */
export function CardStack({
	children,
	noun = "cards",
	peek = 2,
	expanded,
	defaultExpanded = false,
	onExpandedChange,
	showLabel,
	hideLabel = "Show less",
	className,
	style,
	...rest
}: CardStackProps) {
	const [own, setOwn] = useState(defaultExpanded);
	const open = expanded ?? own;
	const listId = useId();
	const items = Children.toArray(children);

	const set = (next: boolean) => {
		if (expanded === undefined) setOwn(next);
		onExpandedChange?.(next);
	};

	return (
		<section
			{...rest}
			data-expanded={open ? "" : undefined}
			className={cn(cardParts.stack, className)}
			style={{ ...style, "--_count": items.length, "--_peeks": peek } as CSSProperties}
		>
			<ol id={listId} className={cardParts.stackList}>
				{items.map((child, index) => (
					<li
						key={childKey(child, index)}
						className={cardParts.stackItem}
						style={{ "--_i": index } as CSSProperties}
						data-hidden={!open && index > peek ? "" : undefined}
						inert={!open && index > 0}
					>
						{child}
					</li>
				))}
			</ol>
			{items.length > 1 ? (
				<button
					type="button"
					className={cardParts.stackToggle}
					aria-expanded={open}
					aria-controls={listId}
					onClick={() => set(!open)}
				>
					{open ? hideLabel : (showLabel ?? `Show all ${items.length} ${noun}`)}
					<span className={cardParts.chevron} aria-hidden="true" />
				</button>
			) : null}
		</section>
	);
}

/** A child's own key when it has one, so reordering keeps each card's state with it. */
function childKey(child: ReturnType<typeof Children.toArray>[number], index: number) {
	return isValidElement(child) && child.key !== null ? child.key : index;
}
