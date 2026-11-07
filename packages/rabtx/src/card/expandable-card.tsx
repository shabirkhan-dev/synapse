"use client";

import type { DetailsHTMLAttributes, ReactNode, Ref, SyntheticEvent } from "react";
import { type CardSize, cardClass, cardParts } from "./card.styles";
import { cn } from "../lib/utils";

export type ExpandableCardProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "title"> & {
	/** The always-visible heading. It is the toggle's accessible name. */
	title: ReactNode;
	/** A line under the title, also always visible. */
	description?: ReactNode;
	/** Padding and spacing, as on Card. */
	size?: CardSize;
	/** Starts open (uncontrolled). Pass `open` with `onOpenChange` to control it instead. */
	defaultOpen?: boolean;
	/** Called with the new state after the user (or `name` grouping) opens or closes it. */
	onOpenChange?: (open: boolean) => void;
	ref?: Ref<HTMLDetailsElement>;
};

/**
 * A card built on `<details>`: the summary row is the toggle, so the browser provides the button
 * role, the expanded state, Enter and Space, find-in-page opening and `name` grouping (only one of
 * a group open at a time). The content grows to its height on the panel spring with
 * `interpolate-size` and `::details-content`; browsers without them open it at once.
 */
export function ExpandableCard({
	title,
	description,
	size = "default",
	open,
	defaultOpen,
	onOpenChange,
	onToggle,
	className,
	children,
	ref,
	...rest
}: ExpandableCardProps) {
	const toggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
		onToggle?.(event as Parameters<NonNullable<typeof onToggle>>[0]);
		onOpenChange?.(event.currentTarget.open);
	};

	return (
		<details
			{...rest}
			ref={ref}
			open={open ?? defaultOpen}
			onToggle={toggle}
			data-slot="card"
			data-size={size}
			className={cn(cardClass(size), cardParts.expandable, className)}
		>
			<summary className={cardParts.summary}>
				<span className={cardParts.header}>
					<span className={cardParts.title}>{title}</span>
					{description ? <span className={cardParts.description}>{description}</span> : null}
				</span>
				<span className={cardParts.chevron} aria-hidden="true" />
			</summary>
			<div className={cardParts.content}>{children}</div>
		</details>
	);
}
