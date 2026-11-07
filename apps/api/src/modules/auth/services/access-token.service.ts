import { jwtVerify } from "jose";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser } from "@/shared/types/app-types";

import { AUTH_ERROR_CODES, AUTH_MESSAGES } from "../constants/auth.constants";

/**
 * Verifies an HS256 access token (`sub` + `sid` claims): signature + expiry only. There is no
 * session lookup, so a revoked session stays usable until its access token expires.
 */
export async function verifyAccessToken(token: string, key: Uint8Array): Promise<AuthUser> {
	try {
		const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
		const sub = typeof payload.sub === "string" ? payload.sub : null;
		const sid = typeof payload.sid === "string" ? payload.sid : null;
		if (!sub || !sid) {
			throw new Error("Missing token claims");
		}
		return { sub, sid };
	} catch (cause) {
		throw new AppError({
			statusCode: HTTP_STATUS.UNAUTHORIZED,
			code: AUTH_ERROR_CODES.ACCESS_TOKEN_INVALID,
			message: AUTH_MESSAGES.ACCESS_TOKEN_INVALID,
			cause,
		});
	}
}
