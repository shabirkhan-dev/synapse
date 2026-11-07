import { z } from "@hono/zod-openapi";

/**
 * The shared envelopes, so clients use one response parser for every route.
 * Success: { success: true, statusCode, requestId, timestamp, data }
 * Error:   { success: false, statusCode, code, message, requestId, timestamp, path, method, errors? }
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

export type ApiSuccessResponse<TData> = {
	success: true;
	statusCode: number;
	requestId: string;
	timestamp: string;
	data: TData;
};
