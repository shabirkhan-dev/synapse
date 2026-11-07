import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { AppBindings } from "../types/app-types";
import { apiErrorSchema, type ApiErrorResponse } from "./response.types";

export function errorBody(
	c: Context<AppBindings>,
	statusCode: number,
	code: string,
	message: string,
	details?: ReadonlyArray<unknown>,
): ApiErrorResponse {
	return {
		success: false,
		statusCode,
		message,
		error: { code, ...(details ? { details: [...details] } : {}) },
		requestId: c.get("requestId") ?? "req_unknown",
		timestamp: new Date().toISOString(),
		path: c.req.path,
		method: c.req.method,
	};
}

/** Send the shared error envelope. */
export function failure<TStatus extends ContentfulStatusCode>(
	c: Context<AppBindings>,
	statusCode: TStatus,
	code: string,
	message: string,
	details?: ReadonlyArray<unknown>,
) {
	return c.json(errorBody(c, statusCode, code, message, details), statusCode);
}

/**
 * OpenAPI responses every protected route can return. `responses` maps keep literal status keys:
 * they are the OpenAPI document's keys, and computed keys break Hono's response typing.
 */
export const errorResponses = {
	401: {
		description: "Missing or invalid access token",
		content: { "application/json": { schema: apiErrorSchema } },
	},
	422: {
		description: "Validation error",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;
