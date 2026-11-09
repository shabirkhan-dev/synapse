import { isSynapseError } from "@synapse/core/errors";
import type { Logger } from "@synapse/observability";
import { RELIABILITY_ERROR_CODES } from "@synapse/reliability";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

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
		const dependency = dependencyFailure(error);
		if (dependency) {
			logger.warn("dependency unavailable", {
				path: c.req.path,
				requestId: c.get("requestId"),
				error,
			});
			return failure(c, dependency.status, dependency.code, dependency.message);
		}
		logger.error("unhandled error", {
			method: c.req.method,
			path: c.req.path,
			requestId: c.get("requestId"),
			error,
		});
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

/** A timeout or open circuit from `@synapse/reliability` (models, email) is a 504/503, not a 500. */
function dependencyFailure(error: Error) {
	if (!isSynapseError(error)) return null;
	if (error.code === RELIABILITY_ERROR_CODES.CIRCUIT_OPEN) {
		return {
			status: HTTP_STATUS.SERVICE_UNAVAILABLE,
			code: error.code,
			message: RESPONSE_MESSAGES.ERRORS.DEPENDENCY_UNAVAILABLE,
		};
	}
	if (error.code === RELIABILITY_ERROR_CODES.TIMEOUT) {
		return {
			status: HTTP_STATUS.GATEWAY_TIMEOUT,
			code: error.code,
			message: RESPONSE_MESSAGES.ERRORS.DEPENDENCY_TIMEOUT,
		};
	}
	return null;
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
