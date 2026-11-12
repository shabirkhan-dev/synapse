import type { Context } from "hono";
import { getConnInfo } from "hono/bun";

import type { AppBindings } from "@/shared/types/app-types";

import type { ClientInfo } from "../types/auth.types";

import { UNKNOWN_CLIENT_IP } from "../constants/auth.constants";

/**
 * The caller's IP for rate limits. Behind one trusted proxy, the last `x-forwarded-for` entry is the
 * address the proxy saw (earlier entries are client-supplied). Otherwise the socket address.
 */
export function clientIp(c: Context<AppBindings>, trustProxy: boolean): string {
	if (trustProxy) {
		const forwarded = c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim();
		if (forwarded) return forwarded;
	}
	// `c.env` is the Bun server under Bun.serve; in-process requests (tests) have no socket.
	const server = c.env as { requestIP?: unknown } | undefined;
	if (typeof server?.requestIP !== "function") return UNKNOWN_CLIENT_IP;
	return getConnInfo(c).remote.address ?? UNKNOWN_CLIENT_IP;
}

/** IP for rate limits plus the `User-Agent`, stored on a new session to tell devices apart. */
export function clientInfo(c: Context<AppBindings>, trustProxy: boolean): ClientInfo {
	return { ip: clientIp(c, trustProxy), userAgent: c.req.header("user-agent") ?? null };
}
