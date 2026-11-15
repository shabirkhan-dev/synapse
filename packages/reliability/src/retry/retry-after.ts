/**
 * How long the server asked us to wait before trying again, in ms, from the error's response
 * headers: `retry-after-ms` (OpenAI and others), else `retry-after` as seconds or an HTTP date.
 * Reads `responseHeaders` (AI SDK `APICallError`) or `headers`, then one level of `cause`.
 */
export function retryAfterMs(error: unknown, now = Date.now(), depth = 0): number | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const { responseHeaders, headers, cause } = error as {
		responseHeaders?: unknown;
		headers?: unknown;
		cause?: unknown;
	};
	const header = headerReader(responseHeaders ?? headers);
	const ms =
		header && (fromMs(header("retry-after-ms")) ?? fromRetryAfter(header("retry-after"), now));
	if (ms !== undefined) return ms;
	return depth === 0 && cause !== undefined ? retryAfterMs(cause, now, 1) : undefined;
}

function headerReader(value: unknown): ((name: string) => string | undefined) | undefined {
	if (value instanceof Headers) return (name) => value.get(name) ?? undefined;
	if (typeof value !== "object" || value === null) return undefined;
	const entries = Object.entries(value as Record<string, unknown>);
	return (name) => {
		const found = entries.find(([key]) => key.toLowerCase() === name)?.[1];
		return typeof found === "string" ? found : undefined;
	};
}

function fromMs(value: string | undefined): number | undefined {
	const ms = value === undefined ? Number.NaN : Number(value);
	return Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : undefined;
}

function fromRetryAfter(value: string | undefined, now: number): number | undefined {
	if (value === undefined || value.trim() === "") return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds)) return seconds >= 0 ? Math.round(seconds * 1000) : undefined;
	const date = Date.parse(value);
	return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}
