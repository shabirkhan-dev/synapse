import type { z } from "zod";

export type FormResult<T> =
	| { success: true; data: T }
	| { success: false; errors: Record<string, string> };

/**
 * Read the named fields of a submitted form and validate them with `schema`: the parsed values,
 * or the first message per field.
 */
export function validateForm<TSchema extends z.ZodType>(
	schema: TSchema,
	form: HTMLFormElement,
	fields: ReadonlyArray<string>,
): FormResult<z.output<TSchema>> {
	const data = new FormData(form);
	const parsed = schema.safeParse(
		Object.fromEntries(fields.map((field) => [field, data.get(field) ?? undefined])),
	);
	if (parsed.success) return { success: true, data: parsed.data };
	const errors: Record<string, string> = {};
	for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
	return { success: false, errors };
}
