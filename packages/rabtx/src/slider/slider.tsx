"use client";

import {
	type ChangeEvent,
	type CSSProperties,
	type HTMLAttributes,
	type PointerEvent,
	type ReactNode,
	type Ref,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { FieldContext } from "../field/field-context";
import { cn } from "../lib/utils";
import {
	type SliderOrientation,
	type SliderSize,
	type SliderVariant,
	sliderClass,
	sliderParts,
} from "./slider.styles";

/** A mark on the scale: a value, or a value with a label drawn under it. */
export type SliderMark = number | { value: number; label?: ReactNode };

export type SliderProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> & {
	/** The thumbs' values, controlled. One number is a slider, two (or more) a range. */
	value?: number[];
	/** The values at first, uncontrolled. Defaults to `[min]`. */
	defaultValue?: number[];
	/** Every value change, by drag, click or key. */
	onValueChange?: (value: number[]) => void;
	/** The values when a drag or a key press ends (the native `change` event). */
	onValueCommit?: (value: number[]) => void;
	min?: number;
	max?: number;
	step?: number;
	/** How many steps two thumbs keep between them. Defaults to 0: they can meet but never cross. */
	minStepsBetweenThumbs?: number;
	/** `vertical` stands the slider up (minimum at the bottom). Give it a height. */
	orientation?: SliderOrientation;
	/** Track 4, 6 (default) or 8px; thumb 16, 20 or 24px. */
	size?: SliderSize;
	/** `ruler` draws a tick scale under a needle, with a large readout above. */
	variant?: SliderVariant;
	disabled?: boolean;
	/** The form field name. A range submits one entry per thumb under it. */
	name?: string;
	form?: string;
	/** A bubble with the value over each thumb: `true` on hover, focus and drag, or `"always"`. */
	showValue?: boolean | "always";
	/** Formats the bubble, the readout, the mark labels and the value read to screen readers. */
	formatValue?: (value: number) => string;
	/** Marks under the track: `true` for every step, or a list of values (with optional labels). */
	marks?: boolean | readonly SliderMark[];
	/** Each thumb's name in a range. Defaults to "Minimum" and "Maximum". */
	thumbLabels?: readonly string[];
	ref?: Ref<HTMLDivElement>;
};

/** Decimal places a step implies, so 0.1 + 0.2 lands on 0.3. */
const decimalsOf = (n: number) => String(n).split(".")[1]?.length ?? 0;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** The most every-step marks drawn before `marks` stops drawing one per step. */
const MAX_STEP_MARKS = 100;

function resolveMarks(marks: SliderProps["marks"], min: number, max: number, step: number) {
	if (!marks) return [];
	if (marks === true) {
		const count = Math.floor(Number(((max - min) / step).toFixed(6)));
		if (count < 1 || count > MAX_STEP_MARKS) return [];
		const places = decimalsOf(step);
		return Array.from({ length: count + 1 }, (_, i) => ({
			value: Number((min + i * step).toFixed(places)),
			label: undefined as ReactNode,
		}));
	}
	return marks
		.map((mark) => (typeof mark === "number" ? { value: mark, label: undefined } : mark))
		.filter((mark) => mark.value >= min && mark.value <= max);
}

/**
 * A slider on native `<input type="range">`s, so arrow keys, Page Up and Down, Home and End,
 * form submission and the slider role come from the browser. One value draws one range whose own
 * track paints the fill; two or more values overlay one range per thumb on a shared track, and
 * each thumb is clamped between its neighbours (`minStepsBetweenThumbs` apart).
 *
 * JavaScript only keeps the values and writes them as CSS variables (`--_lo`, `--_hi`, `--_p`):
 * the fill, the value bubbles and the marks are placed by CSS, and the thumb's press and the
 * bubble's pop are CSS springs.
 */
export function Slider({
	value: valueProp,
	defaultValue,
	onValueChange,
	onValueCommit,
	min = 0,
	max = 100,
	step = 1,
	minStepsBetweenThumbs = 0,
	orientation = "horizontal",
	size,
	variant = "default",
	disabled,
	name,
	form,
	showValue = false,
	formatValue,
	marks,
	thumbLabels,
	className,
	style,
	id: idProp,
	"aria-label": ariaLabel,
	"aria-labelledby": labelledByProp,
	"aria-describedby": describedByProp,
	"aria-invalid": invalidProp,
	ref,
	...rest
}: SliderProps) {
	const field = useContext(FieldContext);
	const autoId = useId();
	const baseId = idProp ?? field?.id ?? autoId;
	const listId = `${autoId}-marks`;
	const [inner, setInner] = useState(() => defaultValue ?? [min]);
	const values = valueProp ?? inner;
	const [active, setActive] = useState<number | null>(null);
	const [dragging, setDragging] = useState<number | null>(null);
	// The values and the commit callback as of the last render, for the event handlers. `update`
	// also writes `latest` at once, so two events in one frame clamp against each other.
	const latest = useRef(values);
	const commitRef = useRef(onValueCommit);
	useLayoutEffect(() => {
		latest.current = values;
		commitRef.current = onValueCommit;
	});
	const controlRef = useRef<HTMLDivElement>(null);

	const range = values.length > 1;
	const span = max - min || 1;
	const places = decimalsOf(step);
	const gap = minStepsBetweenThumbs * step;
	const format = (v: number) => (formatValue ? formatValue(v) : String(v));
	const percent = (v: number) => clamp((v - min) / span, 0, 1);
	const lo = range ? percent(values[0]) : 0;
	const hi = percent(values[values.length - 1]);
	const items = resolveMarks(marks, min, max, step);
	// The ruler draws a tick every step, or every few steps so there are at most 100.
	const steps = Math.max(1, Math.round(span / step));
	const ticks = steps / Math.ceil(steps / MAX_STEP_MARKS);
	const labelled = items.some((mark) => mark.label !== undefined);
	const describedBy = [field?.describedBy, describedByProp].filter(Boolean).join(" ") || undefined;
	const invalid = invalidProp ?? (field?.invalid || undefined);
	const outerLabel = labelledByProp ?? (field && !ariaLabel ? `${field.id}-label` : undefined);
	const names =
		thumbLabels ??
		(values.length === 2
			? ["Minimum", "Maximum"]
			: values.map((_, i) => `${i + 1} of ${values.length}`));

	/** Snaps, clamps between the neighbours, and reports a new value for thumb `index`. */
	const update = (index: number, raw: number) => {
		const current = latest.current;
		let next = Number((Math.round((raw - min) / step) * step + min).toFixed(places));
		next = clamp(next, min, max);
		if (index > 0) next = Math.max(next, current[index - 1] + gap);
		if (index < current.length - 1) next = Math.min(next, current[index + 1] - gap);
		if (next === current[index]) return;
		const updated = current.map((v, i) => (i === index ? next : v));
		latest.current = updated;
		if (valueProp === undefined) setInner(updated);
		onValueChange?.(updated);
	};

	// The native `change` event fires once a drag or a key press is done: that is the commit.
	useEffect(() => {
		const control = controlRef.current;
		if (!control) return;
		const commit = () => commitRef.current?.(latest.current);
		control.addEventListener("change", commit);
		return () => control.removeEventListener("change", commit);
	}, []);

	/** The value under the pointer, from the control's box (mirrored in RTL, bottom-up if vertical). */
	const valueAt = (event: PointerEvent<HTMLDivElement>) => {
		const box = event.currentTarget.getBoundingClientRect();
		const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
		const t =
			orientation === "vertical"
				? (box.bottom - event.clientY) / box.height
				: rtl
					? (box.right - event.clientX) / box.width
					: (event.clientX - box.left) / box.width;
		return min + clamp(t, 0, 1) * span;
	};

	// A range's inputs only take the pointer on their thumbs, so a press on the bare track moves
	// the nearest thumb there and keeps following the pointer until it is released.
	const onTrackDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!range || disabled || event.button !== 0) return;
		if ((event.target as HTMLElement).closest(`.${sliderParts.input}`)) return;
		event.preventDefault();
		const target = valueAt(event);
		const current = latest.current;
		let index = 0;
		for (let i = 1; i < current.length; i++) {
			const d = Math.abs(current[i] - target);
			const best = Math.abs(current[index] - target);
			if (d < best || (d === best && target > current[i])) index = i;
		}
		event.currentTarget.setPointerCapture(event.pointerId);
		setDragging(index);
		setActive(index);
		update(index, target);
		event.currentTarget.querySelectorAll<HTMLInputElement>(`.${sliderParts.input}`)[index]?.focus();
	};
	const onTrackMove = (event: PointerEvent<HTMLDivElement>) => {
		if (dragging !== null) update(dragging, valueAt(event));
	};
	const onTrackUp = () => {
		if (dragging === null) return;
		setDragging(null);
		commitRef.current?.(latest.current);
	};

	// Which thumb sits on top where they overlap: the one last used, except that thumbs meeting at
	// the maximum put the lowest on top, the only one that can still move.
	const pinned = values.findIndex((v) => v >= max);
	const top =
		range && pinned >= 0 && values[pinned] === values[values.length - 1] ? pinned : active;

	return (
		<div
			{...rest}
			ref={ref}
			data-slot="slider"
			data-orientation={orientation}
			data-range={range ? "" : undefined}
			data-disabled={disabled ? "" : undefined}
			data-show-value={showValue === "always" ? "always" : showValue ? "" : undefined}
			data-labels={labelled ? "" : undefined}
			className={cn(sliderClass(size, variant), className)}
			style={{ "--_lo": lo, "--_hi": hi, ...style } as CSSProperties}
		>
			{variant === "ruler" && (
				<div className={sliderParts.readout} aria-hidden="true">
					{values.map(format).join(" – ")}
				</div>
			)}
			<div
				ref={controlRef}
				className={sliderParts.control}
				onPointerDown={onTrackDown}
				onPointerMove={onTrackMove}
				onPointerUp={onTrackUp}
				onPointerCancel={onTrackUp}
			>
				{range && <div className="rx-slider-track" aria-hidden="true" />}
				{variant === "ruler" && (
					<div
						className={sliderParts.scale}
						aria-hidden="true"
						style={{ "--_ticks": ticks } as CSSProperties}
					/>
				)}
				{values.map((v, i) => {
					const thumbId = i === 0 ? baseId : `${baseId}-${i}`;
					return (
						<div
							// Thumbs never reorder: they are clamped between their neighbours.
							// oxlint-disable-next-line no-array-index-key
							key={i}
							className="rx-slider-layer"
							data-top={top === i ? "" : undefined}
							data-dragging={dragging === i ? "" : undefined}
						>
							<input
								type="range"
								id={thumbId}
								className={sliderParts.input}
								min={min}
								max={max}
								step={step}
								value={v}
								name={name}
								form={form}
								disabled={disabled}
								list={items.length ? listId : undefined}
								aria-label={range ? (ariaLabel ? `${ariaLabel} ${names[i]}` : names[i]) : ariaLabel}
								aria-labelledby={range && outerLabel ? `${outerLabel} ${thumbId}` : labelledByProp}
								aria-describedby={describedBy}
								aria-invalid={invalid}
								aria-valuetext={formatValue ? formatValue(v) : undefined}
								aria-orientation={orientation === "vertical" ? "vertical" : undefined}
								onFocus={() => setActive(i)}
								onPointerDown={() => setActive(i)}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									update(i, Number(event.target.value))
								}
							/>
							{showValue && variant !== "ruler" && (
								<span
									className={sliderParts.bubble}
									aria-hidden="true"
									style={{ "--_p": percent(v) } as CSSProperties}
								>
									{format(v)}
								</span>
							)}
						</div>
					);
				})}
			</div>
			{items.length > 0 && (
				<>
					<datalist id={listId}>
						{items.map((mark) => (
							<option key={mark.value} value={mark.value}>
								{typeof mark.label === "string" ? mark.label : format(mark.value)}
							</option>
						))}
					</datalist>
					<div className={sliderParts.marks} aria-hidden="true">
						{items.map((mark) => {
							const p = percent(mark.value);
							return (
								<span
									key={mark.value}
									className={sliderParts.mark}
									data-in={p >= lo && p <= hi ? "" : undefined}
									style={{ "--_p": p } as CSSProperties}
								>
									{mark.label !== undefined && <span>{mark.label}</span>}
								</span>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
