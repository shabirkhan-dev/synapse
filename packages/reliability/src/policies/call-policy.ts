import { isSynapseError } from "@synapse/core/errors";

import {
	circuitOpenError,
	createCircuitBreaker,
	type CircuitState,
} from "../circuit-breakers/circuit-breaker";
import { RELIABILITY_ERROR_CODES } from "../errors";
import { isRetryableError } from "../retry/is-retryable";
import { retry } from "../retry/retry";
import { withTimeout } from "../timeouts/with-timeout";

export type ReliabilityEvent =
	| { type: "retry"; name: string; attempt: number; delayMs: number; error: unknown }
	| { type: "circuit"; name: string; from: CircuitState; to: CircuitState }
	| { type: "fallback"; name: string; error: unknown };

export type CallPolicyOptions = {
	/** Names the dependency in errors and events, e.g. `chat`. */
	name: string;
	/** Per attempt; omit for no deadline. */
	timeoutMs?: number;
	retry: { attempts: number; baseDelayMs: number; maxDelayMs: number };
	breaker: { failureThreshold: number; resetAfterMs: number };
	onEvent?: (event: ReliabilityEvent) => void;
	/** Injected for tests. */
	now?: () => number;
	sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
	random?: () => number;
};

export interface CallPolicy {
	readonly name: string;
	readonly state: CircuitState;
	run<T>(call: (signal: AbortSignal | undefined) => Promise<T>, signal?: AbortSignal): Promise<T>;
}

/**
 * Retry → circuit breaker → timeout, per attempt. Every attempt counts toward the breaker; once it
 * opens, the call stops at once (no backoff wait) with `RELIABILITY_CIRCUIT_OPEN`.
 */
export function createCallPolicy(options: CallPolicyOptions): CallPolicy {
	const { name, timeoutMs, onEvent } = options;
	const breaker = createCircuitBreaker({
		name,
		...options.breaker,
		...(options.now ? { now: options.now } : {}),
		onStateChange: (change) => onEvent?.({ type: "circuit", ...change }),
	});

	return {
		name,
		get state() {
			return breaker.state;
		},
		async run(call, signal) {
			const attempt = () =>
				breaker.run(() =>
					timeoutMs === undefined
						? call(signal)
						: withTimeout(call, { timeoutMs, name, ...(signal ? { signal } : {}) }),
				);
			try {
				return await retry(attempt, {
					...options.retry,
					isRetryable: (error) => breaker.state !== "open" && isRetryableError(error),
					...(options.sleep ? { sleep: options.sleep } : {}),
					...(options.random ? { random: options.random } : {}),
					...(signal ? { signal } : {}),
					onRetry: (event) => onEvent?.({ type: "retry", name, ...event }),
				});
			} catch (error) {
				const opened =
					breaker.state === "open" &&
					!(isSynapseError(error) && error.code === RELIABILITY_ERROR_CODES.CIRCUIT_OPEN);
				throw opened ? circuitOpenError(name, error) : error;
			}
		},
	};
}
