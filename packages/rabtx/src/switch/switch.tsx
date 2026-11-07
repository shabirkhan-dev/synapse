"use client";

import { type ChangeEvent, type InputHTMLAttributes, type Ref, useContext } from "react";
import { FieldContext } from "../field/field-context";
import { cn } from "../lib/utils";
import { type SwitchSize, switchClass, switchParts } from "./switch.styles";

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "role"> & {
	/** Track size: sm (36 by 20), md (48 by 28, the default) or lg (56 by 32). */
	size?: SwitchSize;
	/** The new state after every toggle. `onChange` still receives the native event. */
	onCheckedChange?: (checked: boolean) => void;
	ref?: Ref<HTMLInputElement>;
};

/**
 * The HTML `switch` attribute (Safari 17.4+): the browser treats the checkbox as a switch, so
 * `:indeterminate` never matches and it is announced as on and off. Browsers without it ignore the
 * attribute, and `role="switch"` gives them the same semantics. `switch.css` sets
 * `appearance: none`, so every browser draws the same track and thumb.
 */
const nativeSwitch: Record<string, string> = { switch: "" };

/**
 * A native checkbox drawn as a switch. Space toggles it, forms submit it and its checked state is
 * what assistive technology reads, so there is no `aria-checked` to keep in sync. With children it
 * renders a `<label>` around the switch, so the text names it and the whole row is clickable;
 * without children, put it in a `Field` or give it an `aria-label`.
 *
 * Pressing it stretches the thumb toward where it is going and squishes it a little; releasing
 * springs it across. All of that is CSS (`:checked`, `:active` and the `switch` spring).
 */
export function Switch({
	size,
	onCheckedChange,
	onChange,
	className,
	children,
	ref,
	...rest
}: SwitchProps) {
	const field = useContext(FieldContext);

	const input = (
		<input
			id={field?.id}
			aria-describedby={field?.describedBy}
			aria-invalid={field?.invalid || undefined}
			{...rest}
			{...nativeSwitch}
			type="checkbox"
			role="switch"
			ref={ref}
			className={children ? switchClass(size) : cn(switchClass(size), className)}
			onChange={(event: ChangeEvent<HTMLInputElement>) => {
				onChange?.(event);
				onCheckedChange?.(event.target.checked);
			}}
		/>
	);

	if (!children) return input;
	return (
		<label className={cn(switchParts.label, className)}>
			{input}
			{children}
		</label>
	);
}
