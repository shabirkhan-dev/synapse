import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { mock } from "bun:test";
import type { ReactElement } from "react";

import { setAccessToken } from "@/lib/api/session";

export const API = "http://localhost:8000/api/v1";

export type Call = {
	url: string;
	method: string;
	headers: Headers;
	body: unknown;
	credentials: RequestCredentials | undefined;
};

/** Replace `fetch` with `handler`; returns the recorded calls. */
export function mockFetch(handler: (call: Call) => Response | Promise<Response>): Call[] {
	const calls: Call[] = [];
	globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
		const call = {
			url: String(input),
			method: init?.method ?? "GET",
			headers: new Headers(init?.headers),
			body: init?.body ? JSON.parse(String(init.body)) : undefined,
			credentials: init?.credentials,
		};
		calls.push(call);
		return handler(call);
	}) as unknown as typeof fetch;
	return calls;
}

export const ok = (data: unknown, status = 200) =>
	Response.json({ success: true, statusCode: status, message: "OK", data }, { status });

export const failure = (status: number, code: string, message: string) =>
	Response.json({ success: false, statusCode: status, message, error: { code } }, { status });

export function signedIn(accessToken = "access-1") {
	setAccessToken(accessToken);
}

/** Render inside a fresh QueryClient (no retries, so error states show at once). */
export function renderWithQuery(ui: ReactElement) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
