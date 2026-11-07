"use client";

import { Button, type ButtonProps } from "./button";
import { buttonParts } from "./button.styles";
import { cn } from "../lib/utils";

export type MetallicButtonProps = Omit<ButtonProps, "variant" | "ripple"> & {
	/** Holds the chrome still; the rim keeps its polish. */
	paused?: boolean;
};

/**
 * A Button with a polished chrome rim. The rim's gradient drifts on a slow loop and hovering
 * sweeps a highlight across it, both in CSS. The face is the page color, so the label reads as
 * on a ghost button.
 */
export function MetallicButton({ paused, children, className, ...rest }: MetallicButtonProps) {
	return (
		<Button
			{...(rest as ButtonProps)}
			variant="ghost"
			className={cn("rx-btn-metal", className)}
			data-paused={paused ? "" : undefined}
		>
			<span className={buttonParts.metalRim} aria-hidden="true" />
			<span className={buttonParts.metalSheen} aria-hidden="true" />
			<span className={buttonParts.metalFace} aria-hidden="true" />
			<span className={buttonParts.metalBevel} aria-hidden="true" />
			{children}
		</Button>
	);
}
