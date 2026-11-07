"use client";

import type { PointerEvent } from "react";
import { Card, type CardProps } from "./card";
import { cardParts } from "./card.styles";
import { pointerRatio, setPointerVars } from "./pointer";
import { cn } from "../lib/utils";

export type SpotlightCardProps = CardProps;

/**
 * A Card with a soft light that follows a mouse or pen across it and lights up the edge nearest the
 * pointer. The pointer writes the position as CSS variables; the light, its fade and its color
 * (`--primary`, so `[--primary:var(--violet)]` recolors one card) are CSS. When a link or button
 * inside has keyboard focus, the light rests at the top so focus gets the same highlight.
 */
export function SpotlightCard({
	onPointerMove,
	onPointerLeave,
	className,
	...rest
}: SpotlightCardProps) {
	const follow = (event: PointerEvent<HTMLElement>) => {
		onPointerMove?.(event);
		if (event.pointerType === "touch") return;
		const node = event.currentTarget;
		setPointerVars(node, pointerRatio(node.getBoundingClientRect(), event.clientX, event.clientY));
		node.dataset.pointer = "";
	};

	const release = (event: PointerEvent<HTMLElement>) => {
		onPointerLeave?.(event);
		delete event.currentTarget.dataset.pointer;
	};

	return (
		<Card
			{...rest}
			className={cn(cardParts.spotlight, className)}
			onPointerMove={follow}
			onPointerLeave={release}
		/>
	);
}
