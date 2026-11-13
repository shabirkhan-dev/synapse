import type { z } from "zod";

import { apiConfig } from "@/config/api.config";

import { ApiError, CLIENT_ERROR_CODES, fromErrorEnvelope } from "./api-error";
import { endpoints } from "./endpoints";
import { getAccessToken, getSessionStatus, setAccessToken } from "./session";

export type RequestOptions<TSchema extends z.ZodType> = {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	signal?: AbortSignal;
	/** Send the access token (default). Sign-in, sign-up and the emailed-link calls pass `false`. */
	auth?: boolean;
	/** Extra request headers, e.g. a client-chosen `x-request-id`. */
	headers?: Record<string, string>;
	/** Validates `data` from the success envelope (frontend rule 10). */
	schema: TSchema;
};

/**
 * The only code that calls `fetch`. Sends JSON with the bearer token and the session cookie
 * (`credentials: "include"`; the API scopes the cookie to its auth routes), unwraps the success
 * envelope (`data`), turns the error envelope into `ApiError`, and on a 401 refreshes the session
 * once and retries.
 */
export async function api<TSchema extends z.ZodType>(
	path: string,
	options: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
	const useAuth = options.auth ?? true;
	let response = await send(path, options, useAuth);
	if (response.status === 401 && useAuth && (await refreshSession())) {
		response = await send(path, options, useAuth);
	}
	return parse(response, options.schema);
}

/**
 * A streaming call (server-sent events): same auth, refresh and error mapping as `api`, but the
 * successful `Response` is returned unread so the caller can consume its body as it arrives.
 */
export async function apiStream(
	path: string,
	options: Omit<RequestOptions<z.ZodType>, "schema" | "auth">,
): Promise<Response> {
	let response = await send(path, options, true);
	if (response.status === 401 && (await refreshSession())) {
		response = await send(path, options, true);
	}
	if (!response.ok || !response.body) {
		throw fromErrorEnvelope(response.status, await response.json().catch(() => null));
	}
	return response;
}

/**
 * On page load the tab has no access token: try the cookie once. Afterwards the status is
 * `signed-in` or `signed-out`.
 */
export function restoreSession(): Promise<boolean> {
	if (getSessionStatus() !== "unknown") return Promise.resolve(getSessionStatus() === "signed-in");
	return refreshSession();
}

async function send(
	path: string,
	{ method = "GET", body, signal, headers }: Omit<RequestOptions<z.ZodType>, "schema">,
	useAuth: boolean,
): Promise<Response> {
	const token = useAuth ? getAccessToken() : null;
	// A file upload goes as-is: the browser sets the multipart content type and boundary.
	const isForm = body instanceof FormData;
	try {
		return await fetch(`${apiConfig.baseUrl}${path}`, {
			method,
			credentials: "include",
			headers: {
				...headers,
				accept: "application/json",
				...(body === undefined || isForm ? {} : { "content-type": "application/json" }),
				...(token ? { authorization: `Bearer ${token}` } : {}),
			},
			...(body === undefined ? {} : { body: isForm ? body : JSON.stringify(body) }),
			...(signal ? { signal } : {}),
		});
	} catch (cause) {
		if (signal?.aborted) throw cause;
		throw new ApiError({
			status: 0,
			code: CLIENT_ERROR_CODES.NETWORK_ERROR,
			message: "The API is unreachable. Check your connection and try again.",
		});
	}
}

async function parse<TSchema extends z.ZodType>(
	response: Response,
	schema: TSchema,
): Promise<z.infer<TSchema>> {
	const body: unknown = await response.json().catch(() => null);
	if (!response.ok) throw fromErrorEnvelope(response.status, body);
	const result = schema.safeParse((body as { data?: unknown } | null)?.data);
	if (!result.success) {
		throw new ApiError({
			status: response.status,
			code: CLIENT_ERROR_CODES.INVALID_RESPONSE,
			message: "The API sent an unexpected response.",
			details: result.error.issues,
		});
	}
	return result.data;
}

const REFRESH_LOCK = "synapse-session-refresh";
let refreshing: Promise<boolean> | null = null;

/**
 * One refresh at a time, in this tab and across tabs: refresh tokens are single-use, and two
 * requests carrying the same cookie would look like reuse to the API (which revokes the session).
 * Concurrent 401s in a tab share one call; other tabs wait on a Web Lock, then send the rotated cookie.
 */
function refreshSession(): Promise<boolean> {
	refreshing ??= withLock(rotate).finally(() => {
		refreshing = null;
	});
	return refreshing;
}

function withLock(task: () => Promise<boolean>): Promise<boolean> {
	const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
	return locks ? locks.request(REFRESH_LOCK, task) : task();
}

async function rotate(): Promise<boolean> {
	const response = await send(endpoints.auth.refresh, { method: "POST", body: {} }, false).catch(
		() => null,
	);
	if (!response) {
		// Unreachable API: keep a signed-in tab signed in, let a restoring tab show sign-in.
		if (getSessionStatus() === "unknown") setAccessToken(null);
		return false;
	}
	const body = (await response.json().catch(() => null)) as {
		data?: { accessToken?: unknown };
	} | null;
	const token = response.ok ? body?.data?.accessToken : undefined;
	setAccessToken(typeof token === "string" ? token : null);
	return typeof token === "string";
}
