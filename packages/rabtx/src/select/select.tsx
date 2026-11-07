"use client";

import {
	type ChangeEvent,
	type KeyboardEvent,
	type OptgroupHTMLAttributes,
	type OptionHTMLAttributes,
	type PointerEvent,
	type ReactNode,
	type Ref,
	type SelectHTMLAttributes,
	useContext,
} from "react";
import { FieldContext } from "../field/field-context";
import { useBaseSelect } from "../hooks/use-base-select";
import { cn } from "../lib/utils";
import {
	type SelectSize,
	chooseSide,
	estimateListHeight,
	selectClass,
	selectParts,
} from "./select.styles";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "multiple"> & {
	/** Trigger height: 32, 40 (default) or 48. */
	size?: SelectSize;
	/** Shown, in the placeholder color, until an option is chosen. */
	placeholder?: string;
	/** An icon before the value, such as a globe for a language. */
	leadingIcon?: ReactNode;
	/** The chosen value, after every change. `onChange` still receives the native event. */
	onValueChange?: (value: string) => void;
	/** Applied to the wrapper, so width utilities size the whole control. */
	className?: string;
	ref?: Ref<HTMLSelectElement>;
};

/**
 * A native `<select>` with `SelectItem` (or plain `<option>`) children. The browser supplies the
 * keyboard, typeahead, form value, screen reader semantics and the phone picker. Where the
 * customizable select exists (`appearance: base-select`), the list is drawn and animated by
 * `select.css`: it unfolds from the trigger and the rows fade in. Elsewhere the system list opens
 * and the trigger still looks the same.
 *
 * Put it in a `Field` to get a label, a hint and an error wired up, or give it an `aria-label`.
 */
export function Select({
	size,
	placeholder,
	leadingIcon,
	onValueChange,
	onChange,
	onPointerDown,
	onKeyDown,
	className,
	children,
	value,
	defaultValue,
	ref,
	...rest
}: SelectProps) {
	const field = useContext(FieldContext);
	const initial =
		value === undefined
			? { defaultValue: defaultValue ?? (placeholder === undefined ? undefined : "") }
			: { value };

	return (
		<div className={cn(selectClass(size), className)}>
			{leadingIcon ? (
				<span className={selectParts.leading} aria-hidden="true">
					{leadingIcon}
				</span>
			) : null}
			<select
				id={field?.id}
				aria-describedby={field?.describedBy}
				aria-invalid={field?.invalid || undefined}
				{...rest}
				{...initial}
				ref={ref}
				className={selectParts.select}
				data-leading={leadingIcon ? "" : undefined}
				onChange={(event: ChangeEvent<HTMLSelectElement>) => {
					onChange?.(event);
					onValueChange?.(event.target.value);
				}}
				onPointerDown={(event: PointerEvent<HTMLSelectElement>) => {
					place(event.currentTarget);
					onPointerDown?.(event);
				}}
				onKeyDown={(event: KeyboardEvent<HTMLSelectElement>) => {
					place(event.currentTarget);
					onKeyDown?.(event);
				}}
			>
				{placeholder !== undefined && (
					<option value="" disabled hidden>
						{placeholder}
					</option>
				)}
				{children}
			</select>
			<span className={selectParts.chevron} aria-hidden="true" />
		</div>
	);
}

/**
 * Just before the list can open, decide whether it opens below or above, so the CSS can unfold it
 * from the edge that touches the trigger. Only attributes change; nothing re-renders.
 */
function place(select: HTMLSelectElement) {
	const rect = select.getBoundingClientRect();
	const row = Number.parseFloat(getComputedStyle(select).getPropertyValue("--_row")) || 32;
	const height = estimateListHeight({
		options: select.querySelectorAll("option:not([hidden])").length,
		groups: select.querySelectorAll("optgroup").length,
		separators: select.querySelectorAll("hr").length,
		row,
	});
	select.dataset.side = chooseSide({
		above: rect.top,
		below: window.innerHeight - rect.bottom,
		height,
	});
	// From now on a close is a real close, so the trigger may animate back.
	select.dataset.seen = "";
}

export type SelectItemProps = Omit<OptionHTMLAttributes<HTMLOptionElement>, "value"> & {
	value: string;
	/** An icon before the label in the styled list. Browsers with a system list show the label. */
	icon?: ReactNode;
	ref?: Ref<HTMLOptionElement>;
};

/** One choice: a native `<option>`. The chosen one gets a tick in the styled list. */
export function SelectItem({ icon, children, ref, ...rest }: SelectItemProps) {
	// Rich option content (icons) only where the styled list renders it, and only after hydration.
	const rich = useBaseSelect();
	return (
		<option {...rest} ref={ref}>
			{icon && rich ? (
				<span className={selectParts.itemIcon} aria-hidden="true">
					{icon}
				</span>
			) : null}
			{children}
		</option>
	);
}

export type SelectGroupProps = OptgroupHTMLAttributes<HTMLOptGroupElement> & {
	/** The group's heading. Required: a group without one is not announced. */
	label: string;
};

/** A labelled group of items: a native `<optgroup>`. */
export function SelectGroup(props: SelectGroupProps) {
	return <optgroup {...props} />;
}

/** A line between items: an `<hr>`, which a select draws in its list. */
export function SelectSeparator() {
	return <hr className={selectParts.separator} />;
}
