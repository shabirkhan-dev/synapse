import type { z } from "zod";

import { SynapseError } from "../errors";

export type ConfigSource = Record<string, string | undefined>;

/**
 * Parse a config source (default: `process.env`) with a Zod schema.
 * Empty strings (`KEY=` in .env templates and compose files) count as unset so defaults apply.
 * Throws `SynapseError("CONFIG_INVALID")` listing every failing key.
 */
export function loadConfig<TSchema extends z.ZodType>(
	schema: TSchema,
	source: ConfigSource = process.env,
): z.infer<TSchema> {
	const cleaned = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""));
	const result = schema.safeParse(cleaned);
	if (result.success) {
		return result.data;
	}
	const issues = result.error.issues.map((issue) => ({
		path: issue.path.join(".") || "(root)",
		message: issue.message,
	}));
	const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
	throw new SynapseError("CONFIG_INVALID", `Invalid configuration: ${summary}`, {
		details: issues,
	});
}
