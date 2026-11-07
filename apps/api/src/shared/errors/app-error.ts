import type { ContentfulStatusCode } from "hono/utils/http-status";

export type AppErrorOptions = {
	statusCode: ContentfulStatusCode;
	code: string;
	message: string;
	/** Structured detail returned to the client as `errors` (e.g. validation issues). */
	details?: ReadonlyArray<unknown>;
	cause?: unknown;
};

/**
 * The one application error. Services throw it; the central error handler turns it into the
 * shared error envelope. Use codes and messages from shared or module constants.
 */
export class AppError extends Error {
	readonly statusCode: ContentfulStatusCode;
	readonly code: string;
	readonly details?: ReadonlyArray<unknown>;

	constructor({ statusCode, code, message, details, cause }: AppErrorOptions) {
		super(message, cause === undefined ? undefined : { cause });
		this.name = "AppError";
		this.statusCode = statusCode;
		this.code = code;
		if (details) {
			this.details = details;
		}
	}
}
