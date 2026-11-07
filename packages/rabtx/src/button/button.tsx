"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from "react";
import type { ButtonSize } from "./button.styles";
import { type ButtonLookProps, useButtonLook } from "./use-button";

/** An icon-only button has no visible text, so its type asks for an accessible name. */
export type IconOnly<P> =
	| (P & { size?: Exclude<ButtonSize, "icon"> })
	| (P & { size: "icon"; "aria-label": string });

export type ButtonProps = IconOnly<
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> &
		Omit<ButtonLookProps, "size"> & { ref?: Ref<HTMLButtonElement> }
>;

/**
 * A native `<button>`. Hover grows it a touch on devices with a real pointer, pressing springs it
 * down to `pressScale`, and `ripple` spreads a disc from the press. Icons are children, so the
 * package depends on no icon set.
 */
export function Button({
	variant,
	size,
	pressScale,
	ripple,
	className,
	style,
	onPointerDown,
	type = "button",
	children,
	ref,
	...rest
}: ButtonProps) {
	const look = useButtonLook<HTMLButtonElement>(
		{ variant, size, pressScale, ripple },
		{ className, style, onPointerDown },
	);
	return (
		<button
			{...rest}
			ref={ref}
			type={type}
			className={look.className}
			style={look.style}
			onPointerDown={look.onPointerDown}
		>
			{look.ripples}
			{children}
		</button>
	);
}

export type ButtonLinkProps = IconOnly<
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "size"> &
		Omit<ButtonLookProps, "size"> & { ref?: Ref<HTMLAnchorElement> }
>;

/** A link that looks like a Button. It navigates, so it stays an `<a>` for the browser and readers. */
export function ButtonLink({
	variant,
	size,
	pressScale,
	ripple,
	className,
	style,
	onPointerDown,
	children,
	ref,
	...rest
}: ButtonLinkProps) {
	const look = useButtonLook<HTMLAnchorElement>(
		{ variant, size, pressScale, ripple },
		{ className, style, onPointerDown },
	);
	return (
		<a
			{...rest}
			ref={ref}
			className={look.className}
			style={look.style}
			onPointerDown={look.onPointerDown}
		>
			{look.ripples}
			{children}
		</a>
	);
}
