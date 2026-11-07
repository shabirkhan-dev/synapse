import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { HTTP_STATUS } from "../constants/http-status";
import type { AppBindings } from "../types/app-types";

/** Send the shared success envelope (shape: `ApiSuccessResponse` in response.types.ts). */
export function success<TData, TStatus extends ContentfulStatusCode = typeof HTTP_STATUS.OK>(
	c: Context<AppBindings>,
	data: TData,
	statusCode: TStatus = HTTP_STATUS.OK as TStatus,
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
