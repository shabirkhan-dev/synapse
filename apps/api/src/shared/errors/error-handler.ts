import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { Logger } from "@/infrastructure/logger/logger";

import { ERROR_CODES } from "../constants/error-codes";
import { HTTP_STATUS } from "../constants/http-status";
import { RESPONSE_MESSAGES } from "../constants/response-messages";
import { failure } from "../responses/error-response";
import type { AppBindings } from "../types/app-types";
import { AppError } from "./app-error";

export function createErrorHandler(logger: Logger) {
	return (error: Error, c: Context<AppBindings>) => {
		if (error instanceof AppError) {
			return failure(c, error.statusCode, error.code, error.message, error.details);
		}
		if (error instanceof HTTPException) {
			const status = error.status as ContentfulStatusCode;
			return failure(
				c,
				status,
				codeForStatus(status),
				error.message || RESPONSE_MESSAGES.ERRORS.REQUEST_FAILED,
			);
		}
		logger.error(`unhandled error on ${c.req.method} ${c.req.path}:`, error.stack ?? error.message);
		return failure(
			c,
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			ERROR_CODES.INTERNAL_SERVER_ERROR,
			RESPONSE_MESSAGES.ERRORS.INTERNAL,
		);
	};
}

export function notFoundHandler(c: Context<AppBindings>) {
	return failure(
		c,
		HTTP_STATUS.NOT_FOUND,
		ERROR_CODES.NOT_FOUND,
		RESPONSE_MESSAGES.ERRORS.ROUTE_NOT_FOUND(c.req.method, c.req.path),
	);
}

function codeForStatus(status: number): string {
	switch (status) {
		case HTTP_STATUS.BAD_REQUEST:
			return ERROR_CODES.BAD_REQUEST;
		case HTTP_STATUS.UNAUTHORIZED:
			return ERROR_CODES.UNAUTHORIZED;
		case HTTP_STATUS.FORBIDDEN:
			return ERROR_CODES.FORBIDDEN;
		case HTTP_STATUS.NOT_FOUND:
			return ERROR_CODES.NOT_FOUND;
		case HTTP_STATUS.PAYLOAD_TOO_LARGE:
			return ERROR_CODES.PAYLOAD_TOO_LARGE;
		default:
			return status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
				? ERROR_CODES.INTERNAL_SERVER_ERROR
				: ERROR_CODES.HTTP_ERROR;
	}
}
