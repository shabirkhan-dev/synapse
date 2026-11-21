import { createMiddleware } from "hono/factory";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AppBindings } from "@/shared/types/app-types";

import {
	API_KEY_PREFIX,
	AUTH_ERROR_CODES,
	AUTH_MESSAGES,
	BEARER_PREFIX,
} from "../constants/auth.constants";
import type { ApiKeysService } from "../services/api-keys.service";
import type { AuthService } from "../services/auth.service";

/**
 * Reads the bearer token, verifies it and sets `c.get("user")`: an access token from a session, or
 * (when `apiKeys` is given) a personal API key (`syn_…`).
 */
export function createAuthMiddleware(auth: AuthService, apiKeys?: ApiKeysService) {
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
		c.set(
			"user",
			apiKeys && token.startsWith(API_KEY_PREFIX)
				? await apiKeys.authenticate(token)
				: await auth.authenticate(token),
		);
		await next();
	});
}

/** After authentication: refuse API keys where only a signed-in person may act (keys, sessions). */
export function createSessionOnlyMiddleware() {
	return createMiddleware<AppBindings>(async (c, next) => {
		if (c.get("user").via !== "session") {
			throw new AppError({
				statusCode: HTTP_STATUS.FORBIDDEN,
				code: AUTH_ERROR_CODES.SESSION_REQUIRED,
				message: AUTH_MESSAGES.SESSION_REQUIRED,
			});
		}
		await next();
	});
}
