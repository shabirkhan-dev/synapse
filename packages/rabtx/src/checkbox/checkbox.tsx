"use client";

import {
	type ChangeEvent,
	type InputHTMLAttributes,
	type ReactNode,
	type Ref,
	useContext,
	useEffect,
	useId,
	useRef,
} from "react";
import { FieldContext } from "../field/field-context";
import { cn } from "../lib/utils";
import { type CheckboxSize, checkboxClass, checkboxParts, checkboxPaths } from "./checkbox.styles";

/** shadcn's checked state: on, off, or partly on. */
export type CheckedState = boolean | "indeterminate";

export type CheckboxProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"type" | "size" | "checked" | "defaultChecked"
> & {
	/** Controlled state. `"indeterminate"` is the same as `indeterminate` with `checked={false}`. */
	checked?: CheckedState;
	defaultChecked?: boolean;
	/** The partly-checked look, such as a "select all" with some of its rows chosen. */
	indeterminate?: boolean;
	/** The new state after every click or Space. `onChange` still receives the native event. */
	onCheckedChange?: (checked: boolean) => void;
	/** Box size: 16, 20 (default) or 24. */
	size?: CheckboxSize;
	/** A quieter line under the label. Needs children (the label). */
	description?: ReactNode;
	ref?: Ref<HTMLInputElement>;
};

/**
 * A native checkbox whose tick draws itself in. With children it renders a `<label>` around the box,
 * so the text names it and the whole row is clickable; without children, give it an `aria-label`
 * or put it in a `Field`. Indeterminate always follows the prop (the browser would clear it on a
 * click), so keep it in your own state and compute it on every render.
 */
export function Checkbox({
	checked,
	defaultChecked,
	indeterminate,
	onCheckedChange,
	onChange,
	size,
	description,
	className,
	children,
	id: idProp,
	"aria-describedby": describedByProp,
	"aria-invalid": invalidProp,
	ref,
	...rest
}: CheckboxProps) {
	const field = useContext(FieldContext);
	const autoId = useId();
	const inner = useRef<HTMLInputElement>(null);
	const mixed = indeterminate === true || checked === "indeterminate";

	// No dependency list: the prop wins after every render, whatever the browser did meanwhile.
	useEffect(() => {
		if (inner.current) inner.current.indeterminate = mixed;
	});

	const id = idProp ?? field?.id ?? autoId;
	const labelled = children !== undefined && children !== null;
	const descriptionId = labelled && description ? `${id}-description` : undefined;
	// A wrapping label would read the description as part of the name, so name it by the text alone.
	const labelId = descriptionId && !rest["aria-label"] ? `${id}-label` : undefined;
	const describedBy =
		[field?.describedBy, describedByProp, descriptionId].filter(Boolean).join(" ") || undefined;

	const box = (
		<span className={cn(checkboxClass(size), labelled ? undefined : className)}>
			<input
				{...rest}
				id={id}
				type="checkbox"
				aria-describedby={describedBy}
				aria-labelledby={rest["aria-labelledby"] ?? labelId}
				aria-invalid={invalidProp ?? (field?.invalid || undefined)}
				{...(checked === undefined ? { defaultChecked } : { checked: checked === true })}
				ref={(node) => {
					inner.current = node;
					if (node) node.indeterminate = mixed;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				className={checkboxParts.input}
				onChange={(event: ChangeEvent<HTMLInputElement>) => {
					onChange?.(event);
					onCheckedChange?.(event.target.checked);
					// The click cleared it; keep the prop's value until a render brings a new one.
					event.target.indeterminate = mixed;
				}}
			/>
			<svg
				className={cn(checkboxParts.mark, checkboxParts.check)}
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path d={checkboxPaths.check} pathLength={1} />
			</svg>
			<svg
				className={cn(checkboxParts.mark, checkboxParts.dash)}
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path d={checkboxPaths.dash} pathLength={1} />
			</svg>
		</span>
	);

	if (!labelled) return box;
	return (
		<label className={cn(checkboxParts.label, className)}>
			{box}
			<span className={checkboxParts.text}>
				<span id={labelId}>{children}</span>
				{description ? (
					<span id={descriptionId} className={checkboxParts.description}>
						{description}
					</span>
				) : null}
			</span>
		</label>
	);
}
