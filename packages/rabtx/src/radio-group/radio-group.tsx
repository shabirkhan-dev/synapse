"use client";

import {
	type ChangeEvent,
	createContext,
	type FieldsetHTMLAttributes,
	type InputHTMLAttributes,
	type ReactNode,
	type Ref,
	useContext,
	useId,
	useMemo,
} from "react";
import { FieldContext } from "../field/field-context";
import { cn } from "../lib/utils";
import {
	type RadioGroupOrientation,
	type RadioGroupSize,
	type RadioGroupVariant,
	radioGroupClass,
	radioGroupParts,
} from "./radio-group.styles";

type GroupState = {
	name: string;
	/** The controlled value, or undefined when the group keeps its own state. */
	value: string | undefined;
	defaultValue: string | undefined;
	onValueChange: ((value: string) => void) | undefined;
	required: boolean | undefined;
	form: string | undefined;
};

const RadioGroupContext = createContext<GroupState | null>(null);

export type RadioGroupProps = Omit<
	FieldsetHTMLAttributes<HTMLFieldSetElement>,
	"onChange" | "defaultValue"
> & {
	/** The chosen option's value, controlled. An empty string means none is chosen. */
	value?: string;
	/** The option chosen at first, uncontrolled. */
	defaultValue?: string;
	/** The new value after every change, by click, Space or an arrow key. */
	onValueChange?: (value: string) => void;
	/** The form field name. One is generated when left out, so the arrow keys still group. */
	name?: string;
	/** Stack the options (default) or lay them out in a wrapping row. */
	orientation?: RadioGroupOrientation;
	/** Circle size: 16, 20 (default) or 24. */
	size?: RadioGroupSize;
	/** `card` draws every option as a bordered choice card, the circle at the end. */
	variant?: RadioGroupVariant;
	/** One of the options must be chosen before the form submits. */
	required?: boolean;
	ref?: Ref<HTMLFieldSetElement>;
};

/**
 * A set of native radios sharing one `name` inside a `<fieldset role="radiogroup">`. The browser
 * moves the choice with the arrow keys, keeps one tab stop, submits the value and announces it;
 * `disabled` on the fieldset disables every option at once. Give the group a name with
 * `aria-label`, `aria-labelledby` or a `Field`.
 *
 * The chosen option's dot glides to it, in CSS only: where anchor positioning exists the dot is one
 * element anchored to the checked circle, elsewhere each circle pops its own dot in.
 */
export function RadioGroup({
	value,
	defaultValue,
	onValueChange,
	name,
	orientation = "vertical",
	size,
	variant,
	required,
	form,
	className,
	children,
	id: idProp,
	"aria-describedby": describedByProp,
	"aria-labelledby": labelledByProp,
	"aria-invalid": invalidProp,
	ref,
	...rest
}: RadioGroupProps) {
	const field = useContext(FieldContext);
	const autoName = useId();
	const id = idProp ?? field?.id;
	const describedBy = [field?.describedBy, describedByProp].filter(Boolean).join(" ") || undefined;
	const labelledBy =
		labelledByProp ?? (field && !rest["aria-label"] ? `${field.id}-label` : undefined);
	const state = useMemo(
		() => ({ name: name ?? autoName, value, defaultValue, onValueChange, required, form }),
		[name, autoName, value, defaultValue, onValueChange, required, form],
	);

	return (
		<RadioGroupContext value={state}>
			<fieldset
				{...rest}
				ref={ref}
				id={id}
				role="radiogroup"
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				aria-invalid={invalidProp ?? (field?.invalid || undefined)}
				aria-required={required || undefined}
				data-orientation={orientation}
				className={cn(radioGroupClass(size, variant), className)}
			>
				{children}
			</fieldset>
		</RadioGroupContext>
	);
}

export type RadioGroupItemProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"type" | "size" | "value" | "checked" | "defaultChecked" | "name"
> & {
	/** The value the group takes when this option is chosen. */
	value: string;
	/** A quieter line under the label. */
	description?: ReactNode;
	/** The label. Without it, give the option an `aria-label`. */
	children?: ReactNode;
	ref?: Ref<HTMLInputElement>;
};

/**
 * One option: a `<label>` around a native radio and its text, so the text names it and the whole
 * row (or card) is clickable. `className` goes on the label.
 */
export function RadioGroupItem({
	value,
	description,
	children,
	className,
	onChange,
	id: idProp,
	"aria-describedby": describedByProp,
	ref,
	...rest
}: RadioGroupItemProps) {
	const group = useContext(RadioGroupContext);
	if (!group) throw new Error("RadioGroupItem must be used inside a RadioGroup");
	const autoId = useId();
	const id = idProp ?? autoId;
	const labelled = children !== undefined && children !== null;
	const descriptionId = description ? `${id}-description` : undefined;
	// The wrapping label would read the description as part of the name, so name it by the text alone.
	const labelId = labelled && descriptionId && !rest["aria-label"] ? `${id}-label` : undefined;
	const describedBy = [describedByProp, descriptionId].filter(Boolean).join(" ") || undefined;

	return (
		<label className={cn(radioGroupParts.item, className)}>
			<span className={radioGroupParts.radio}>
				<input
					required={group.required}
					form={group.form}
					{...rest}
					ref={ref}
					id={id}
					type="radio"
					name={group.name}
					value={value}
					aria-labelledby={rest["aria-labelledby"] ?? labelId}
					aria-describedby={describedBy}
					{...(group.value === undefined
						? { defaultChecked: group.defaultValue === value }
						: { checked: group.value === value })}
					className={radioGroupParts.input}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						onChange?.(event);
						if (event.target.checked) group.onValueChange?.(value);
					}}
				/>
			</span>
			{labelled || description ? (
				<span className={radioGroupParts.text}>
					{labelled ? <span id={labelId}>{children}</span> : null}
					{description ? (
						<span id={descriptionId} className={radioGroupParts.description}>
							{description}
						</span>
					) : null}
				</span>
			) : null}
		</label>
	);
}
