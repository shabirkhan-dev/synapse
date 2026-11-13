import type { CircuitState } from "@synapse/reliability";

export type CircuitSnapshot = {
	/** The call policy's name: `chat`, `embeddings`, `chat-fallback`, `rerank`, `email`. */
	name: string;
	state: CircuitState;
	/** When it last changed state in this process; null if it never has. */
	since: string | null;
};

export type CircuitStatus = {
	record(name: string, state: CircuitState): void;
	snapshot(): CircuitSnapshot[];
};

/**
 * The last known state of each circuit breaker in this process, fed by the policies' circuit
 * events. A breaker only moves from open to half-open on its next call, so an old "open" may
 * already be ready for a trial call.
 */
export function createCircuitStatus(
	names: string[],
	now: () => Date = () => new Date(),
): CircuitStatus {
	const circuits = new Map<string, Omit<CircuitSnapshot, "name">>(
		names.map((name) => [name, { state: "closed", since: null }]),
	);
	return {
		record(name, state) {
			circuits.set(name, { state, since: now().toISOString() });
		},
		snapshot: () => [...circuits].map(([name, circuit]) => Object.assign({ name }, circuit)),
	};
}
