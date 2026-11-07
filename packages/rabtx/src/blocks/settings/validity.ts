/** A message for each way a native control can fail its constraints, by `ValidityState` key. */
export type ValidityMessages = Partial<Record<Exclude<keyof ValidityState, "valid">, string>>;

const ORDER = [
	"valueMissing",
	"typeMismatch",
	"tooShort",
	"tooLong",
	"patternMismatch",
	"rangeUnderflow",
	"rangeOverflow",
	"stepMismatch",
	"badInput",
	"customError",
] as const;

type Validatable = { validity: ValidityState; validationMessage: string };

/**
 * The first failing constraint of a native control, as a message: yours for that constraint, or
 * the browser's own. Nothing when the control is valid. Constraints come from the markup
 * (`required`, `type="email"`, `minLength`, `pattern`) and `setCustomValidity`, so the CSS
 * `:user-invalid` state and this message always agree.
 */
export function validityMessage(
	control: Validatable,
	messages: ValidityMessages = {},
): string | undefined {
	const { validity } = control;
	if (validity.valid) return undefined;
	for (const key of ORDER) {
		if (validity[key]) return messages[key] ?? (control.validationMessage || "Check this field.");
	}
	return control.validationMessage || "Check this field.";
}
