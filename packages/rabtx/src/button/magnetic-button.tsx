"use client";

import type { PointerEvent } from "react";
import { Button, type ButtonProps } from "./button";
import { magneticOffset } from "./magnetic";
import { cn } from "../lib/utils";

export type MagneticButtonProps = ButtonProps & {
	/** How strongly the button leans toward the pointer, 0 to 1. Default 0.25. */
	strength?: number;
};

/**
 * A Button that leans toward a mouse pointer and springs back when it leaves. The pointer only
 * writes two CSS variables; the CSS `translate` transition on the magnetic spring does the motion,
 * and turns itself off for touch, reduced motion and `data-motion="off"`.
 */
export function MagneticButton({
	strength = 0.25,
	onPointerMove,
	onPointerLeave,
	className,
	...rest
}: MagneticButtonProps) {
	const follow = (event: PointerEvent<HTMLButtonElement>) => {
		onPointerMove?.(event);
		if (event.pointerType !== "mouse") return;
		const node = event.currentTarget;
		// Measure without the current lean, or the button would chase its own offset.
		const rect = node.getBoundingClientRect();
		const now = currentOffset(node);
		const { x, y } = magneticOffset(
			// DOMRect fields are getters, so they are copied by name, not spread.
			{ left: rect.left - now.x, top: rect.top - now.y, width: rect.width, height: rect.height },
			event.clientX,
			event.clientY,
			strength,
		);
		node.style.setProperty("--_btn-mx", `${x}px`);
		node.style.setProperty("--_btn-my", `${y}px`);
	};

	const release = (event: PointerEvent<HTMLButtonElement>) => {
		onPointerLeave?.(event);
		event.currentTarget.style.removeProperty("--_btn-mx");
		event.currentTarget.style.removeProperty("--_btn-my");
	};

	return (
		<Button
			{...(rest as ButtonProps)}
			className={cn("rx-btn-magnet", className)}
			onPointerMove={follow}
			onPointerLeave={release}
		/>
	);
}

function currentOffset(node: HTMLElement) {
	const read = (name: string) => Number.parseFloat(node.style.getPropertyValue(name)) || 0;
	return { x: read("--_btn-mx"), y: read("--_btn-my") };
}
