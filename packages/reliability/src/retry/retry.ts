import { isRetryableError } from "./is-retryable";

export type RetryOptions = {
	/** Total attempts, including the first. */
	attempts: number;
	/** Delay cap before attempt 2; doubles each attempt up to `maxDelayMs`. */
	baseDelayMs: number;
	maxDelayMs: number;
	isRetryable?: (error: unknown) => boolean;
	/** Injected for tests; defaults to a real timer that stops when `signal` aborts. */
	sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
	/** Injected for tests; full jitter uses `random() * cap`. */
	random?: () => number;
	signal?: AbortSignal;
	onRetry?: (event: { attempt: number; delayMs: number; error: unknown }) => void;
};

/** Run `call` until it succeeds, fails with a final error, or runs out of attempts. */
export async function retry<T>(
	call: (attempt: number) => Promise<T>,
	{
		attempts,
		baseDelayMs,
		maxDelayMs,
		isRetryable = isRetryableError,
		sleep = abortableSleep,
		random = Math.random,
		signal,
		onRetry,
	}: RetryOptions,
): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			// Attempts are sequential by design.
			// oxlint-disable-next-line no-await-in-loop
			return await call(attempt);
		} catch (error) {
			if (attempt >= attempts || signal?.aborted || !isRetryable(error)) throw error;
			const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
			const delayMs = Math.round(random() * cap);
			onRetry?.({ attempt, delayMs, error });
			// oxlint-disable-next-line no-await-in-loop
			await sleep(delayMs, signal);
		}
	}
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(signal.reason);
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
