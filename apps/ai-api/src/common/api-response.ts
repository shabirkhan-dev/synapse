import { z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { AppBindings } from "./app-types";

/**
 * Same envelopes as apps/nest-api (ApiSuccessResponse / ApiErrorResponse) so clients
 * can share one response parser across both services.
 */
export const apiErrorSchema = z
	.object({
		success: z.literal(false),
		statusCode: z.number().int(),
		code: z.string(),
		message: z.string(),
		requestId: z.string(),
		timestamp: z.string(),
		path: z.string(),
		method: z.string(),
		errors: z.array(z.unknown()).optional(),
	})
	.openapi("ApiError");

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export function successEnvelope<TData extends z.ZodType>(data: TData) {
	return z.object({
		success: z.literal(true),
		statusCode: z.number().int(),
		requestId: z.string(),
		timestamp: z.string(),
		data,
	});
}

export function success<TData, TStatus extends ContentfulStatusCode = 200>(
	c: Context<AppBindings>,
	data: TData,
	statusCode: TStatus = 200 as TStatus,
) {
	return c.json(
		{
			success: true as const,
			statusCode,
			requestId: c.get("requestId"),
			timestamp: new Date().toISOString(),
			data,
		},
		statusCode,
	);
}

export function errorBody(
	c: Context<AppBindings>,
	statusCode: number,
	code: string,
	message: string,
	errors?: ReadonlyArray<unknown>,
): ApiErrorResponse {
	return {
		success: false,
		statusCode,
		code,
		message,
		requestId: c.get("requestId") ?? "req_unknown",
		timestamp: new Date().toISOString(),
		path: c.req.path,
		method: c.req.method,
		...(errors ? { errors: [...errors] } : {}),
	};
}

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
