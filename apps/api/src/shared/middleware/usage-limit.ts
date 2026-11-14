import { createMiddleware } from "hono/factory";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { RESPONSE_MESSAGES } from "@/shared/constants/response-messages";
import { AppError } from "@/shared/errors/app-error";
import type { AppBindings } from "@/shared/types/app-types";

/** The auth module's fixed-window limiter (`DrizzleRateLimiter`), seen structurally. */
export type UsageLimiter = {
	hit(
		key: string,
		rule: { limit: number; windowSeconds: number },
	): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
};

/**
 * A per-user budget for requests that call a model. Runs after authentication; over the budget
 * the request stops before any model call with `429 RATE_LIMITED` and `Retry-After`.
 */
export function createUsageLimit(
	limiter: UsageLimiter,
	name: string,
	rule: { limit: number; windowSeconds: number },
) {
	return createMiddleware<AppBindings>(async (c, next) => {
		const { allowed, retryAfterSeconds } = await limiter.hit(
			`usage:${name}:${c.get("user").sub}`,
			rule,
		);
		if (!allowed) {
			c.header("Retry-After", String(retryAfterSeconds));
			throw new AppError({
				statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
				code: ERROR_CODES.RATE_LIMITED,
				message: RESPONSE_MESSAGES.ERRORS.RATE_LIMITED(retryAfterSeconds),
				details: [{ retryAfterSeconds }],
			});
		}
		await next();
	});
}
