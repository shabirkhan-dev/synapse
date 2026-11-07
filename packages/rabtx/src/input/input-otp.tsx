"use client";

import {
	type ChangeEvent,
	type CSSProperties,
	type InputHTMLAttributes,
	type Ref,
	type SyntheticEvent,
	useContext,
	useState,
} from "react";
import { FieldContext } from "../field/field-context";
import { cn } from "../lib/utils";
import { type InputSize, type OtpCharset, cleanCode, otpClass, otpParts } from "./input.styles";

export type InputOTPProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"size" | "value" | "defaultValue" | "maxLength" | "type"
> & {
	/** How many characters the code has. Default 6. */
	length?: number;
	/** Slot height: 32, 40 (default) or 48. */
	size?: InputSize;
	/** Which characters are kept. Default digits, with the numeric keyboard on phones. */
	charset?: OtpCharset;
	/** Show a dot for each character instead of the character. */
	mask?: boolean;
	value?: string;
	defaultValue?: string;
	/** The code after every change. `onChange` still receives the native event. */
	onValueChange?: (value: string) => void;
	/** Called once each time the last slot is filled. */
	onComplete?: (value: string) => void;
	/** Applied to the wrapper. */
	className?: string;
	ref?: Ref<HTMLInputElement>;
};

/**
 * A one-time code: one native input, so typing, backspace, paste and SMS autofill
 * (`autocomplete="one-time-code"`) all work as usual, shown as a row of slots. The focus ring glides
 * to the next slot and each character rolls in, in CSS. Put it in a `Field` for a label and a hint,
 * or give it an `aria-label`.
 */
export function InputOTP({
	length = 6,
	size,
	charset = "digits",
	mask,
	value,
	defaultValue,
	onValueChange,
	onComplete,
	onChange,
	onSelect,
	className,
	ref,
	...rest
}: InputOTPProps) {
	const field = useContext(FieldContext);
	const [own, setOwn] = useState(() => cleanCode(defaultValue ?? "", length, charset));
	const code = value === undefined ? own : cleanCode(value, length, charset);
	const active = Math.min(code.length, length - 1);
	const any = charset === "digits" ? "\\d" : "[A-Za-z0-9]";

	return (
		<div className={cn(otpClass(size), className)} style={{ "--_at": active } as CSSProperties}>
			<input
				id={field?.id}
				aria-describedby={field?.describedBy}
				aria-invalid={field?.invalid || undefined}
				aria-label={field ? undefined : "One-time code"}
				autoComplete="one-time-code"
				inputMode={charset === "digits" ? "numeric" : "text"}
				autoCapitalize="off"
				autoCorrect="off"
				spellCheck={false}
				pattern={`${any}{${length}}`}
				{...rest}
				ref={ref}
				type="text"
				maxLength={length}
				value={code}
				className={otpParts.input}
				onChange={(event: ChangeEvent<HTMLInputElement>) => {
					const next = cleanCode(event.target.value, length, charset);
					if (value === undefined) setOwn(next);
					onChange?.(event);
					onValueChange?.(next);
					if (next.length === length && code.length < length) onComplete?.(next);
				}}
				onSelect={(event: SyntheticEvent<HTMLInputElement>) => {
					keepCaretAtEnd(event.currentTarget);
					onSelect?.(event);
				}}
			/>
			<div className={otpParts.slots} aria-hidden="true">
				{Array.from({ length }, (_, index) => {
					const char = code[index];
					return (
						<span
							// The slots are a fixed row that never reorders.
							// oxlint-disable-next-line react/no-array-index-key
							key={index}
							className={otpParts.slot}
							data-filled={char ? "" : undefined}
							data-active={index === active ? "" : undefined}
						>
							{char ? (
								<span key={char} className={otpParts.char}>
									{mask ? "•" : char}
								</span>
							) : null}
						</span>
					);
				})}
			</div>
			<span className={otpParts.ring} aria-hidden="true" />
		</div>
	);
}

/**
 * A code is typed and erased at its end, so a bare caret anywhere else moves back there. A real
 * selection (select all, to retype) is left alone.
 */
function keepCaretAtEnd(input: HTMLInputElement) {
	const end = input.value.length;
	if (input.selectionStart === input.selectionEnd && input.selectionStart !== end) {
		input.setSelectionRange(end, end);
	}
}
