import { PASSWORD, SYSTEM, uniqueEmail } from "./env";

/** The API's response envelope, loosely typed: suites check status, codes and a few fields. */
export type Envelope<T = unknown> = {
	success: boolean;
	statusCode: number;
	message: string;
	data: T;
	error?: { code: string; details?: unknown };
};

export type Reply<T> = { status: number; headers: Headers; body: Envelope<T> };

type RequestOptions = {
	method?: string;
	token?: string;
	body?: unknown;
	/** Sent as-is (a raw string is not JSON-encoded): for oversized or malformed bodies. */
	rawBody?: string;
	headers?: Record<string, string>;
};

/** A documentation-range address (RFC 5737), different for every call. */
export function clientIp(): string {
	return `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
}

export async function call<T = unknown>(
	path: string,
	{ method = "GET", token, body, rawBody, headers = {} }: RequestOptions = {},
): Promise<Reply<T>> {
	const response = await fetch(`${SYSTEM.apiUrl}${path}`, {
		method,
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
			...headers,
		},
		body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
	});
	const text = await response.text();
	let parsed: Envelope<T>;
	try {
		parsed = JSON.parse(text) as Envelope<T>;
	} catch {
		throw new Error(`${method} ${path} → ${response.status}, not JSON: ${text.slice(0, 200)}`);
	}
	return { status: response.status, headers: response.headers, body: parsed };
}

export type Account = {
	email: string;
	userId: string;
	accessToken: string;
	refreshToken: string;
};

type SignedIn = {
	user: { id: string };
	tokens: { accessToken: string; refreshToken?: string };
};

/** A new account, signed up from its own client IP so the per-IP sign-up limit never trips. */
export async function signUp(prefix = "system"): Promise<Account> {
	const email = uniqueEmail(prefix);
	const reply = await call<SignedIn>("/auth/sign-up", {
		method: "POST",
		body: { email, password: PASSWORD },
		headers: { "x-forwarded-for": clientIp() },
	});
	if (reply.status !== 201 || !reply.body.data.tokens.refreshToken) {
		throw new Error(`sign-up failed: ${reply.status} ${JSON.stringify(reply.body)}`);
	}
	return {
		email,
		userId: reply.body.data.user.id,
		accessToken: reply.body.data.tokens.accessToken,
		refreshToken: reply.body.data.tokens.refreshToken,
	};
}
