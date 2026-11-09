import { SynapseError } from "@synapse/core/errors";

import { RELIABILITY_ERROR_CODES } from "../errors";
import { isRetryableError } from "../retry/is-retryable";

/** The fail-fast error; `cause` is the failure that opened the circuit, when known. */
export function circuitOpenError(name: string, cause?: unknown): SynapseError {
	return new SynapseError(
		RELIABILITY_ERROR_CODES.CIRCUIT_OPEN,
		`${name} is unavailable (circuit open)`,
		{ retryable: false, ...(cause === undefined ? {} : { cause }) },
	);
}

export type CircuitState = "closed" | "open" | "half-open";

export type CircuitBreakerOptions = {
	name: string;
	/** Consecutive failures that open the circuit. */
	failureThreshold: number;
	/** How long the circuit stays open before one trial call is let through. */
	resetAfterMs: number;
	/** Which errors mean the dependency is unhealthy; by default the retryable ones (not a 400). */
	isFailure?: (error: unknown) => boolean;
	/** Injected for tests. */
	now?: () => number;
	onStateChange?: (event: { name: string; from: CircuitState; to: CircuitState }) => void;
};

export interface CircuitBreaker {
	readonly state: CircuitState;
	run<T>(call: () => Promise<T>): Promise<T>;
}

/**
 * closed → (N consecutive failures) → open → (after `resetAfterMs`) → half-open: one trial call;
 * success closes the circuit, failure opens it again. While open, calls fail fast with
 * `RELIABILITY_CIRCUIT_OPEN` instead of waiting on a dependency that is down.
 */
export function createCircuitBreaker({
	name,
	failureThreshold,
	resetAfterMs,
	isFailure = isRetryableError,
	now = Date.now,
	onStateChange,
}: CircuitBreakerOptions): CircuitBreaker {
	let state: CircuitState = "closed";
	let failures = 0;
	let openedAt = 0;
	let trialInFlight = false;

	const moveTo = (next: CircuitState) => {
		if (next === state) return;
		const from = state;
		state = next;
		onStateChange?.({ name, from, to: next });
	};

	const rejectOpen = () => circuitOpenError(name);

	return {
		get state() {
			return state;
		},
		async run(call) {
			if (state === "open" && now() - openedAt >= resetAfterMs) moveTo("half-open");
			if (state === "open" || (state === "half-open" && trialInFlight)) throw rejectOpen();
			const trial = state === "half-open";
			trialInFlight = trial;
			try {
				const result = await call();
				failures = 0;
				moveTo("closed");
				return result;
			} catch (error) {
				if (isFailure(error)) {
					failures += 1;
					if (trial || failures >= failureThreshold) {
						openedAt = now();
						moveTo("open");
					}
				} else if (trial) {
					// The dependency answered (e.g. a 400): it is up.
					failures = 0;
					moveTo("closed");
				}
				throw error;
			} finally {
				if (trial) trialInFlight = false;
			}
		},
	};
}
