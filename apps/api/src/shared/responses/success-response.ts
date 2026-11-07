import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { HTTP_STATUS } from "../constants/http-status";
import type { AppBindings } from "../types/app-types";

/**
 * Send the shared success envelope (shape: `ApiSuccessResponse` in response.types.ts).
 * `message` comes from shared or module constants.
 */
export function success<TData, TStatus extends ContentfulStatusCode = typeof HTTP_STATUS.OK>(
	c: Context<AppBindings>,
	data: TData,
	message: string,
	statusCode: TStatus = HTTP_STATUS.OK as TStatus,
) {
	return c.json(
		{
			success: true as const,
			statusCode,
			message,
			data,
			requestId: c.get("requestId"),
			timestamp: new Date().toISOString(),
		},
		statusCode,
	);
}
