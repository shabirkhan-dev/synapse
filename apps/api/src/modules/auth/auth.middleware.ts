import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";

import { AppError } from "@/common/app-error";
import type { AppBindings } from "@/common/app-types";

import type { AuthUser } from "./auth.types";

/**
 * Verifies an HS256 access token signed with JWT_SECRET (`sub` + `sid` claims).
 *
 * This is a stateless check: signature + expiry only. There is no session lookup, so a revoked
 * session stays usable until its access token expires.
 */
export function createAuthMiddleware(jwtSecret: string) {
	const key = new TextEncoder().encode(jwtSecret);

	return createMiddleware<AppBindings>(async (c, next) => {
		const header = c.req.header("authorization");
		const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
		if (!token) {
			throw new AppError(401, "AUTH_ACCESS_TOKEN_MISSING", "Missing bearer access token");
		}
		c.set("user", await verifyAccessToken(token, key));
		await next();
	});
}

export async function verifyAccessToken(token: string, key: Uint8Array): Promise<AuthUser> {
	try {
		const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
		const sub = typeof payload.sub === "string" ? payload.sub : null;
		const sid = typeof payload.sid === "string" ? payload.sid : null;
		if (!sub || !sid) {
			throw new Error("Missing token claims");
		}
		return { sub, sid };
	} catch {
		throw new AppError(401, "AUTH_ACCESS_TOKEN_INVALID", "Invalid or expired access token");
	}
}
