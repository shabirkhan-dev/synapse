import type { InputHTMLAttributes, Ref } from "react";
import { toggleClass, toggleLabelClass } from "./toggle.styles";

export type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
	ref?: Ref<HTMLInputElement>;
};

/**
 * An on/off switch: a native checkbox with the switch role, so it is announced as "on" or "off".
 * With children it renders a `<label>` around the track, so the text names it and the whole row is
 * clickable. Without children, give it an `aria-label`. Use it for settings that apply at once;
 * use a Checkbox for choices that wait for a Save.
 */
export function Toggle({ className, children, ref, ...rest }: ToggleProps) {
	// A native checkbox already exposes its checked state; aria-checked would duplicate it and can drift.
	/* oxlint-disable jsx-a11y/role-has-required-aria-props */
	const input = (
		<input
			{...rest}
			type="checkbox"
			role="switch"
			ref={ref}
			className={children ? toggleClass : `${toggleClass} ${className ?? ""}`}
		/>
	);
	/* oxlint-enable jsx-a11y/role-has-required-aria-props */

	if (!children) return input;
	return (
		<label className={`${toggleLabelClass} ${className ?? ""}`}>
			{input}
			{children}
		</label>
	);
}
