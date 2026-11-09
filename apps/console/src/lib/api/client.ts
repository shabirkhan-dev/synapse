import type { z } from "zod";

import { apiConfig } from "@/config/api.config";

import { ApiError, CLIENT_ERROR_CODES, fromErrorEnvelope } from "./api-error";
import { endpoints } from "./endpoints";
import { getSession, setSession } from "./session";

export type RequestOptions<TSchema extends z.ZodType> = {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	signal?: AbortSignal;
	/** Send the access token (default). Sign-in and refresh pass `false`. */
	auth?: boolean;
	/** Validates `data` from the success envelope (frontend rule 10). */
	schema: TSchema;
};

/**
 * The only code that calls `fetch`. Sends JSON with the bearer token, unwraps the success
 * envelope (`data`), turns the error envelope into `ApiError`, and on a 401 refreshes the session
 * once and retries. A failed refresh clears the session.
 */
export async function api<TSchema extends z.ZodType>(
	path: string,
	options: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
	const useAuth = options.auth ?? true;
	let response = await send(path, options, useAuth);
	if (response.status === 401 && useAuth && getSession() && (await refreshSession())) {
		response = await send(path, options, useAuth);
	}
	return parse(response, options.schema);
}

async function send(
	path: string,
	{ method = "GET", body, signal }: Omit<RequestOptions<z.ZodType>, "schema">,
	useAuth: boolean,
): Promise<Response> {
	const token = useAuth ? getSession()?.accessToken : undefined;
	try {
		return await fetch(`${apiConfig.baseUrl}${path}`, {
			method,
			headers: {
				accept: "application/json",
				...(body === undefined ? {} : { "content-type": "application/json" }),
				...(token ? { authorization: `Bearer ${token}` } : {}),
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
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

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time: concurrent 401s wait for the same rotation (refresh tokens are single-use). */
function refreshSession(): Promise<boolean> {
	refreshing ??= rotate().finally(() => {
		refreshing = null;
	});
	return refreshing;
}

async function rotate(): Promise<boolean> {
	const refreshToken = getSession()?.refreshToken;
	if (!refreshToken) return false;
	const response = await send(
		endpoints.auth.refresh,
		{ method: "POST", body: { refreshToken } },
		false,
	).catch(() => null);
	const body = (await response?.json().catch(() => null)) as {
		data?: { accessToken?: unknown; refreshToken?: unknown };
	} | null;
	const tokens = body?.data;
	if (
		!response?.ok ||
		typeof tokens?.accessToken !== "string" ||
		typeof tokens.refreshToken !== "string"
	) {
		setSession(null);
		return false;
	}
	setSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
	return true;
}
