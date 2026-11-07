import type { HTMLAttributes, Ref } from "react";
import { type CardSize, cardClass, cardParts } from "./card.styles";
import { cn } from "../lib/utils";

type Part<T extends string> = HTMLAttributes<HTMLElement> & {
	/** The element to render. */
	as?: T;
	ref?: Ref<HTMLElement>;
};

export type CardProps = Part<"div" | "article" | "section" | "aside" | "li"> & {
	/** Padding and spacing for every part: 12, 16 (default) or 20px. */
	size?: CardSize;
};

/**
 * A surface that holds one subject. The parts pad themselves on the inline axis, so a part can be
 * left out and an image placed directly inside runs edge to edge. Depth and radius follow the page
 * modes (`data-depth`, `data-radius`), not props.
 *
 * A card never takes focus itself. To make one clickable or selectable, put a link, button or label
 * inside with `cardParts.target`: it stretches over the card and the card answers hover, press,
 * focus and a checked input, all from CSS.
 */
export function Card({ as = "div", size = "default", className, ref, ...rest }: CardProps) {
	// One element type for the checker; the tag still renders as given.
	const Tag = as as "div";
	return (
		<Tag
			{...rest}
			ref={ref as Ref<HTMLDivElement>}
			data-slot="card"
			data-size={size}
			className={cn(cardClass(size), className)}
		/>
	);
}

/** Title and description, with an optional CardAction pinned to the top right. */
export function CardHeader({ as: Tag = "div", className, ref, ...rest }: Part<"div" | "header">) {
	return (
		<Tag
			{...rest}
			ref={ref as Ref<HTMLDivElement>}
			data-slot="card-header"
			className={cn(cardParts.header, className)}
		/>
	);
}

export function CardTitle({
	as: Tag = "div",
	className,
	ref,
	...rest
}: Part<"div" | "h2" | "h3" | "h4" | "h5" | "h6">) {
	return (
		<Tag
			{...rest}
			ref={ref as Ref<HTMLDivElement>}
			data-slot="card-title"
			className={cn(cardParts.title, className)}
		/>
	);
}

export function CardDescription({ as: Tag = "p", className, ref, ...rest }: Part<"p" | "div">) {
	return (
		<Tag
			{...rest}
			ref={ref as Ref<HTMLParagraphElement>}
			data-slot="card-description"
			className={cn(cardParts.description, className)}
		/>
	);
}

/** Sits beside the title and description inside CardHeader, such as a button or a badge. */
export function CardAction({ className, ref, ...rest }: Omit<Part<"div">, "as">) {
	return (
		<div
			{...rest}
			ref={ref as Ref<HTMLDivElement>}
			data-slot="card-action"
			className={cn(cardParts.action, className)}
		/>
	);
}

export function CardContent({ className, ref, ...rest }: Omit<Part<"div">, "as">) {
	return (
		<div
			{...rest}
			ref={ref as Ref<HTMLDivElement>}
			data-slot="card-content"
			className={cn(cardParts.content, className)}
		/>
	);
}

export function CardFooter({ as: Tag = "div", className, ref, ...rest }: Part<"div" | "footer">) {
	return (
		<Tag
			{...rest}
			ref={ref as Ref<HTMLDivElement>}
			data-slot="card-footer"
			className={cn(cardParts.footer, className)}
		/>
	);
}
