import { createMiddleware } from "hono/factory";

import type { AuthConfig } from "@/config";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AppBindings } from "@/shared/types/app-types";

import { AUTH_ERROR_CODES, AUTH_MESSAGES, BEARER_PREFIX } from "../constants/auth.constants";
import { verifyAccessToken } from "../services/access-token.service";

/** Reads the bearer token, verifies it and sets `c.get("user")`. */
export function createAuthMiddleware({ jwtSecret }: AuthConfig) {
	const key = new TextEncoder().encode(jwtSecret);

	return createMiddleware<AppBindings>(async (c, next) => {
		const header = c.req.header("authorization");
		const token = header?.startsWith(BEARER_PREFIX)
			? header.slice(BEARER_PREFIX.length).trim()
			: "";
		if (!token) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNAUTHORIZED,
				code: AUTH_ERROR_CODES.ACCESS_TOKEN_MISSING,
				message: AUTH_MESSAGES.ACCESS_TOKEN_MISSING,
			});
		}
		c.set("user", await verifyAccessToken(token, key));
		await next();
	});
}
