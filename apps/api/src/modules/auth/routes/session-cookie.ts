import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import type { AuthConfig } from "@/config";
import type { AppBindings } from "@/shared/types/app-types";

type Tokens = { refreshToken?: string; refreshTokenExpiresAt?: string };
type CookieConfig = AuthConfig["cookie"];

/**
 * Put the refresh token in the httpOnly cookie (ADR-0007) and return the tokens without it, so the
 * page never sees the long-lived secret.
 */
export function moveRefreshTokenToCookie<T extends Tokens>(
	c: Context<AppBindings>,
	tokens: T,
	cookie: CookieConfig,
): Omit<T, "refreshToken" | "refreshTokenExpiresAt"> {
	const { refreshToken, refreshTokenExpiresAt, ...rest } = tokens;
	if (refreshToken) {
		setCookie(c, cookie.name, refreshToken, {
			httpOnly: true,
			secure: cookie.secure,
			sameSite: "Strict",
			path: cookie.path,
			...(refreshTokenExpiresAt ? { expires: new Date(refreshTokenExpiresAt) } : {}),
		});
	}
	return rest;
}

export function readRefreshCookie(
	c: Context<AppBindings>,
	cookie: CookieConfig,
): string | undefined {
	return getCookie(c, cookie.name) || undefined;
}

export function clearRefreshCookie(c: Context<AppBindings>, cookie: CookieConfig): void {
	deleteCookie(c, cookie.name, { path: cookie.path, secure: cookie.secure, sameSite: "Strict" });
}
