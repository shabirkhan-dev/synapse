import { SynapseError } from "@synapse/core/errors";

import { RELIABILITY_ERROR_CODES } from "../errors";

export type TimeoutOptions = {
	timeoutMs: number;
	/** The caller's signal; aborting it aborts the call (and is not turned into a timeout). */
	signal?: AbortSignal;
	/** Named in the error message, e.g. `chat`. */
	name?: string;
};

/**
 * Run `call` with a deadline. The call gets a signal that aborts on timeout or when the caller
 * aborts; a call that ignores its signal still rejects at the deadline with `RELIABILITY_TIMEOUT`.
 */
export async function withTimeout<T>(
	call: (signal: AbortSignal) => Promise<T>,
	{ timeoutMs, signal, name = "call" }: TimeoutOptions,
): Promise<T> {
	signal?.throwIfAborted();
	const controller = new AbortController();
	const forwardAbort = () => controller.abort(signal?.reason);
	signal?.addEventListener("abort", forwardAbort, { once: true });
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			const error = new SynapseError(
				RELIABILITY_ERROR_CODES.TIMEOUT,
				`${name} timed out after ${timeoutMs} ms`,
				{ retryable: true },
			);
			controller.abort(error);
			reject(error);
		}, timeoutMs);
	});
	try {
		return await Promise.race([call(controller.signal), deadline]);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", forwardAbort);
	}
}
