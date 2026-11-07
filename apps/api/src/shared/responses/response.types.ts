import { z } from "@hono/zod-openapi";

/**
 * The shared envelopes, so clients use one response parser for every route.
 * Success: { success: true, statusCode, message, data, requestId, timestamp }
 * Error:   { success: false, statusCode, message, error: { code, details? }, requestId, timestamp, path, method }
 * `message` is for people; `error.code` is the machine-readable identifier.
 */
export const apiErrorSchema = z
	.object({
		success: z.literal(false),
		statusCode: z.number().int(),
		message: z.string(),
		error: z.object({
			code: z.string(),
			details: z.array(z.unknown()).optional(),
		}),
		requestId: z.string(),
		timestamp: z.string(),
		path: z.string(),
		method: z.string(),
	})
	.openapi("ApiError");

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export function successEnvelope<TData extends z.ZodType>(data: TData) {
	return z.object({
		success: z.literal(true),
		statusCode: z.number().int(),
		message: z.string(),
		data,
		requestId: z.string(),
		timestamp: z.string(),
	});
}

export type ApiSuccessResponse<TData> = {
	success: true;
	statusCode: number;
	message: string;
	data: TData;
	requestId: string;
	timestamp: string;
};
