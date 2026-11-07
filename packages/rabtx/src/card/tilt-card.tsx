"use client";

import type { PointerEvent } from "react";
import { Card, type CardProps } from "./card";
import { cardParts } from "./card.styles";
import { pointerRatio, setPointerVars, tiltAngles } from "./pointer";
import { cn } from "../lib/utils";

export type TiltCardProps = CardProps & {
	/** The most the card turns at a corner, in degrees. Default 10. */
	max?: number;
	/** A soft highlight under the pointer. Default true. */
	glare?: boolean;
};

/**
 * A Card that leans toward a mouse or pen in 3D, with a glare that follows it, and springs back
 * flat when the pointer leaves. The pointer only writes CSS variables; the `transform` transition on
 * the magnetic spring does the motion and is off for touch, reduced motion and `data-motion="off"`.
 * It is decoration: it adds no focus stop and no role.
 */
export function TiltCard({
	max = 10,
	glare = true,
	onPointerMove,
	onPointerLeave,
	className,
	...rest
}: TiltCardProps) {
	const follow = (event: PointerEvent<HTMLElement>) => {
		onPointerMove?.(event);
		if (event.pointerType === "touch") return;
		const node = event.currentTarget;
		// offsetWidth/Height are the untransformed size, so the tilt does not skew the measurement.
		const rect = node.getBoundingClientRect();
		const ratio = pointerRatio(
			{
				left: rect.left + (rect.width - node.offsetWidth) / 2,
				top: rect.top + (rect.height - node.offsetHeight) / 2,
				width: node.offsetWidth,
				height: node.offsetHeight,
			},
			event.clientX,
			event.clientY,
		);
		const { x, y } = tiltAngles(ratio, max);
		node.style.setProperty("--_tilt-x", `${x}deg`);
		node.style.setProperty("--_tilt-y", `${y}deg`);
		setPointerVars(node, ratio);
		node.dataset.pointer = "";
	};

	const release = (event: PointerEvent<HTMLElement>) => {
		onPointerLeave?.(event);
		const node = event.currentTarget;
		node.style.removeProperty("--_tilt-x");
		node.style.removeProperty("--_tilt-y");
		delete node.dataset.pointer;
	};

	return (
		<Card
			{...rest}
			data-glare={glare ? "" : undefined}
			className={cn(cardParts.tilt, className)}
			onPointerMove={follow}
			onPointerLeave={release}
		/>
	);
}
