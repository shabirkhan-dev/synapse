"use client";

import {
	type CSSProperties,
	type PointerEvent,
	type PointerEventHandler,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { type ButtonSize, type ButtonVariant, buttonClass, buttonParts } from "./button.styles";
import { cn } from "../lib/utils";

export type ButtonLookProps = {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** Scale while pressed. 1 turns the press off. Default 0.93. */
	pressScale?: number;
	/** A soft disc spreads from where the button was pressed. */
	ripple?: boolean;
};

type Ripple = { id: number; x: number; y: number; d: number };

/** Whether the user or an ancestor asked for no motion. Ripples are skipped then, not hidden. */
export function motionReduced(node: Element): boolean {
	if (node.closest('[data-motion="off"]')) return true;
	return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Where a ripple starts and how big it grows: centred on the press, and twice the longer side so
 * it covers the button from any corner.
 */
export function ripplePlacement(
	rect: { left: number; top: number; width: number; height: number },
	clientX: number,
	clientY: number,
) {
	return {
		x: clientX - rect.left,
		y: clientY - rect.top,
		d: Math.max(rect.width, rect.height) * 2,
	};
}

/** The class, style, ripple layer and pointer handler every button element shares. */
export function useButtonLook<E extends HTMLElement>(
	{ variant, size, pressScale, ripple }: ButtonLookProps,
	{
		look,
		className,
		style,
		onPointerDown,
	}: {
		look?: "magnetic" | "metallic";
		className?: string;
		style?: CSSProperties;
		onPointerDown?: PointerEventHandler<E>;
	},
): {
	className: string;
	style: CSSProperties | undefined;
	onPointerDown: PointerEventHandler<E>;
	ripples: ReactNode;
} {
	const [ripples, setRipples] = useState<Ripple[]>([]);
	const nextId = useRef(0);

	const handlePointerDown = (event: PointerEvent<E>) => {
		onPointerDown?.(event);
		if (!ripple || event.button !== 0 || motionReduced(event.currentTarget)) return;
		const placed = ripplePlacement(
			event.currentTarget.getBoundingClientRect(),
			event.clientX,
			event.clientY,
		);
		const id = nextId.current++;
		setRipples((current) => [...current, { id, ...placed }]);
	};

	return {
		className: cn(buttonClass({ variant, size, look }), className),
		style:
			pressScale === undefined
				? style
				: ({ ...style, "--_btn-press": String(pressScale) } as CSSProperties),
		onPointerDown: handlePointerDown,
		ripples: ripple ? (
			<span className={buttonParts.ripples} aria-hidden="true">
				{ripples.map(({ id, x, y, d }) => (
					<span
						key={id}
						className={buttonParts.ripple}
						style={
							{
								"--_ripple-x": `${x}px`,
								"--_ripple-y": `${y}px`,
								"--_ripple-d": `${d}px`,
							} as CSSProperties
						}
						onAnimationEnd={() => setRipples((current) => current.filter((r) => r.id !== id))}
					/>
				))}
			</span>
		) : null,
	};
}
