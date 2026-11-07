import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Throw from routes and services; the error handler maps it to the shared error envelope. */
export class AppError extends Error {
	readonly statusCode: ContentfulStatusCode;
	readonly code: string;
	readonly errors?: ReadonlyArray<unknown>;

	constructor(
		statusCode: ContentfulStatusCode,
		code: string,
		message: string,
		errors?: ReadonlyArray<unknown>,
	) {
		super(message);
		this.name = "AppError";
		this.statusCode = statusCode;
		this.code = code;
		if (errors) {
			this.errors = errors;
		}
	}
}
