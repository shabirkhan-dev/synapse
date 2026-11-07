"use client";

import {
	type InputHTMLAttributes,
	type ReactNode,
	type Ref,
	type SVGProps,
	useContext,
	useId,
	useRef,
	useState,
} from "react";
import { FieldContext } from "../field/field-context";
import { cn } from "../lib/utils";
import { type InputSize, type InputVariant, inputClass, inputParts } from "./input.styles";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
	/** Control height: 32, 40 (default) or 48, the same as the Button and the Select. */
	size?: InputSize;
	/** `outline` (default) matches the Select trigger; `filled` is the recessed field. */
	variant?: InputVariant;
	/** Fully round, for search bars. Independent of the radius mode. */
	pill?: boolean;
	/** A decorative icon before the text. */
	leadingIcon?: ReactNode;
	/** A decorative icon after the text. */
	trailingIcon?: ReactNode;
	/** A segment at the start, such as `https://`. Read with the field by screen readers. */
	startAddon?: ReactNode;
	/** A segment at the end, such as `.com` or a unit. */
	endAddon?: ReactNode;
	/**
	 * A floating label: it sits where the text goes and floats to the top edge once the input is
	 * focused or filled. Use it instead of a Field label, not with one. Needs md or lg.
	 */
	label?: ReactNode;
	/** Show a clear button while the input has a value. */
	clearable?: boolean;
	/** Called after the clear button empties the input. */
	onClear?: () => void;
	/** The clear button's accessible name. */
	clearLabel?: string;
	/** Draw a green tick at the end, for a value that has been checked. */
	success?: boolean;
	/** A button on the trailing edge; give it `inputParts.action`. */
	action?: ReactNode;
	/** Applied to the wrapper, so width utilities size the whole control. */
	className?: string;
	ref?: Ref<HTMLInputElement>;
};

/**
 * A native `<input>` inside a wrapper that draws the field, the same size and look as the Select
 * trigger. Put it in a `Field` to get a label, a hint and an error wired up, or give it a floating
 * `label` or an `aria-label`. `aria-invalid`, or a failed native constraint once the person has
 * edited it, turns the edge red and shakes it once.
 */
export function Input({
	size,
	variant,
	pill,
	leadingIcon,
	trailingIcon,
	startAddon,
	endAddon,
	label,
	clearable,
	onClear,
	clearLabel = "Clear",
	success,
	action,
	className,
	placeholder,
	id,
	ref,
	...rest
}: InputProps) {
	const inner = useRef<HTMLInputElement>(null);
	const field = useContext(FieldContext);
	const ownId = useId();
	const inputId = id ?? field?.id ?? (label ? ownId : undefined);
	const { icon, addon } = inputParts;

	const input = (
		<input
			id={inputId}
			aria-describedby={field?.describedBy}
			aria-invalid={field?.invalid || undefined}
			{...rest}
			// `:placeholder-shown` is how the CSS knows the input is empty, so there is always one.
			placeholder={placeholder ?? (clearable || label ? " " : undefined)}
			ref={(node) => {
				inner.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			className={inputParts.input}
		/>
	);

	return (
		// The wrapper only forwards pointer focus; keyboard users already land on the input.
		// oxlint-disable-next-line jsx-a11y/no-static-element-interactions
		<div
			className={cn(inputClass({ size, variant, pill }), className)}
			onPointerDown={(event) => {
				if (event.target instanceof Element && event.target.closest("input, button, a, label"))
					return;
				event.preventDefault();
				inner.current?.focus();
			}}
		>
			{startAddon != null && <span className={addon}>{startAddon}</span>}
			{leadingIcon && (
				<span className={icon} aria-hidden="true">
					{leadingIcon}
				</span>
			)}
			{label ? (
				<span className={inputParts.float}>
					{input}
					<label htmlFor={inputId} className={inputParts.label}>
						{label}
					</label>
				</span>
			) : (
				input
			)}
			{clearable && (
				<button
					type="button"
					aria-label={clearLabel}
					className={`${inputParts.action} ${inputParts.clear}`}
					onClick={() => {
						if (!inner.current) return;
						clearInput(inner.current);
						onClear?.();
					}}
				>
					<CrossIcon />
				</button>
			)}
			{success && (
				<span className={`${icon} ${inputParts.check}`} aria-hidden="true">
					<TickIcon />
				</span>
			)}
			{trailingIcon && (
				<span className={icon} aria-hidden="true">
					{trailingIcon}
				</span>
			)}
			{action}
			{endAddon != null && <span className={addon}>{endAddon}</span>}
		</div>
	);
}

/**
 * Empty an input the way typing would, so React's `onChange` fires for controlled and uncontrolled
 * inputs alike, then put focus back in it.
 */
export function clearInput(input: HTMLInputElement) {
	const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
	setValue?.call(input, "");
	input.dispatchEvent(new Event("input", { bubbles: true }));
	input.focus();
}

export type PasswordInputProps = Omit<InputProps, "type" | "action"> & {
	/** The eye button's accessible name. Its pressed state says whether the password shows. */
	revealLabel?: string;
};

/** An Input for passwords with an eye button that shows and hides the text. */
export function PasswordInput({
	revealLabel = "Show password",
	disabled,
	...rest
}: PasswordInputProps) {
	const [shown, setShown] = useState(false);
	return (
		<Input
			autoComplete="current-password"
			{...rest}
			disabled={disabled}
			type={shown ? "text" : "password"}
			action={
				<button
					type="button"
					aria-label={revealLabel}
					aria-pressed={shown}
					disabled={disabled}
					className={`${inputParts.action} ${inputParts.reveal}`}
					onClick={() => setShown((value) => !value)}
				>
					<EyeIcon data-when="hidden" />
					<EyeOffIcon data-when="shown" />
				</button>
			}
		/>
	);
}

// HugeIcons (MIT) glyphs, inlined so the component needs no icon package.
type IconProps = SVGProps<SVGSVGElement> & { "data-when"?: string };

function Icon({ children, ...props }: IconProps) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			{children}
		</svg>
	);
}

function CrossIcon() {
	return (
		<Icon>
			<path d="M19 5L5 19M5 5l14 14" />
		</Icon>
	);
}

function TickIcon() {
	return (
		<Icon strokeWidth={2}>
			<path d="M5 14L8.5 17.5L19 6.5" pathLength={1} />
		</Icon>
	);
}

function EyeIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M21.544 11.045C21.848 11.4713 22 11.6845 22 12C22 12.3155 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C7.31078 19 3.8221 14.8706 2.45604 12.955C2.15201 12.5287 2 12.3155 2 12C2 11.6845 2.15201 11.4713 2.45604 11.045C3.8221 9.12944 7.31078 5 12 5C16.6892 5 20.1779 9.12944 21.544 11.045Z" />
			<path d="M15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12Z" />
		</Icon>
	);
}

function EyeOffIcon(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M19.439 15.439C20.3636 14.5212 21.0775 13.6091 21.544 12.955C21.848 12.5287 22 12.3155 22 12C22 11.6845 21.848 11.4713 21.544 11.045C20.1779 9.12944 16.6892 5 12 5C11.0922 5 10.2294 5.15476 9.41827 5.41827M6.74742 6.74742C4.73118 8.1072 3.24215 9.94266 2.45604 11.045C2.15201 11.4713 2 11.6845 2 12C2 12.3155 2.15201 12.5287 2.45604 12.955C3.8221 14.8706 7.31078 19 12 19C13.9908 19 15.7651 18.2557 17.2526 17.2526" />
			<path d="M9.85786 10C9.32783 10.53 9 11.2623 9 12.0711C9 13.6887 10.3113 15 11.9289 15C12.7377 15 13.47 14.6722 14 14.1421" />
			<path d="M3 3L21 21" />
		</Icon>
	);
}
