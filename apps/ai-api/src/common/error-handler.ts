import type { Logger } from "@starter/logger";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { errorBody } from "./api-response";
import { AppError } from "./app-error";
import type { AppBindings } from "./app-types";

export function createErrorHandler(logger: Logger) {
	return (error: Error, c: Context<AppBindings>) => {
		if (error instanceof AppError) {
			return c.json(
				errorBody(c, error.statusCode, error.code, error.message, error.errors),
				error.statusCode,
			);
		}
		if (error instanceof HTTPException) {
			const status = error.status as ContentfulStatusCode;
			return c.json(
				errorBody(c, status, httpCode(status), error.message || "Request failed"),
				status,
			);
		}
		logger.error(`unhandled error on ${c.req.method} ${c.req.path}:`, error.stack ?? error.message);
		return c.json(errorBody(c, 500, "INTERNAL_SERVER_ERROR", "Internal server error"), 500);
	};
}

export function notFoundHandler(c: Context<AppBindings>) {
	return c.json(
		errorBody(c, 404, "NOT_FOUND", `Route ${c.req.method} ${c.req.path} not found`),
		404,
	);
}

function httpCode(status: number): string {
	switch (status) {
		case 400:
			return "BAD_REQUEST";
		case 401:
			return "UNAUTHORIZED";
		case 403:
			return "FORBIDDEN";
		case 404:
			return "NOT_FOUND";
		case 413:
			return "PAYLOAD_TOO_LARGE";
		default:
			return status >= 500 ? "INTERNAL_SERVER_ERROR" : "HTTP_ERROR";
	}
}
