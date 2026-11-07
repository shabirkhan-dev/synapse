export interface SynapseErrorOptions {
	/** Structured detail for callers (e.g. validation issues). */
	details?: ReadonlyArray<unknown>;
	cause?: unknown;
}

/**
 * Base error for every package. Transport-neutral: apps map `code` to HTTP status or job outcome.
 * Codes are SCREAMING_SNAKE_CASE and prefixed by area (`CONFIG_`, `RAG_`, `AUTH_`).
 */
export class SynapseError extends Error {
	readonly code: string;
	readonly details?: ReadonlyArray<unknown>;

	constructor(code: string, message: string, options: SynapseErrorOptions = {}) {
		super(message, options.cause === undefined ? undefined : { cause: options.cause });
		this.name = "SynapseError";
		this.code = code;
		if (options.details) {
			this.details = options.details;
		}
	}
}

export function isSynapseError(error: unknown): error is SynapseError {
	return error instanceof SynapseError;
}
