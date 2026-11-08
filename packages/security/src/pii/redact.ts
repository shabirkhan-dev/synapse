/**
 * Patterns for personal data and secrets that must not reach logs or the audit trail. Order matters:
 * secrets first, so a token that contains digits is not half-redacted as a phone number.
 */
const RULES: Array<{ pattern: RegExp; label: string }> = [
	// JWTs (three base64url parts starting with eyJ).
	{ pattern: /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}\b/g, label: "[secret]" },
	// Provider keys: OpenAI/Langfuse sk-…, pk-lf-…, Resend re_…, Doppler dp.st.…, GitHub gh?_…, AWS AKIA….
	{
		pattern:
			/\b(?:sk-[\w-]{16,}|pk-lf-[\w-]{16,}|re_\w{16,}|dp\.(?:st|pt|sa)\.[\w.-]{16,}|gh[pousr]_\w{20,}|AKIA[0-9A-Z]{16})\b/g,
		label: "[secret]",
	},
	{ pattern: /\bBearer\s+[\w.~+/-]{16,}=*/gi, label: "Bearer [secret]" },
	{ pattern: /\b[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi, label: "[email]" },
	// Card-like numbers: 13–19 digits, optionally grouped by spaces or dashes. Not part of a longer
	// hyphenated token, so UUIDs (`23141549-3005-4927-…`) stay intact.
	{ pattern: /(?<![\w-])(?:\d[ -]?){12,18}\d(?![\w-])/g, label: "[card]" },
	// Phone-like: optional +, 9–15 digits with common separators (same UUID rule).
	{ pattern: /(?<![\w+-])\+?\d(?:[\s().-]?\d){8,14}(?![\w-])/g, label: "[phone]" },
];

/** Replace emails, phone and card numbers, tokens and API keys with placeholders. */
export function redactPii(text: string): string {
	let result = text;
	for (const { pattern, label } of RULES) {
		result = result.replace(pattern, label);
	}
	return result;
}

/** `redactPii` on every string inside a JSON-like value (objects, arrays); other values unchanged. */
export function redactPiiDeep<T>(value: T): T {
	if (typeof value === "string") {
		return redactPii(value) as T;
	}
	if (Array.isArray(value)) {
		return value.map((item) => redactPiiDeep(item)) as T;
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, redactPiiDeep(item)]),
		) as T;
	}
	return value;
}
