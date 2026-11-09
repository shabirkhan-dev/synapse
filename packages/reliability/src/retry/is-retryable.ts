import { isSynapseError } from "@synapse/core/errors";

import { RELIABILITY_ERROR_CODES } from "../errors";

const RETRYABLE_STATUS = new Set([408, 409, 425, 429]);
const SERVER_ERROR = 500;

/**
 * Whether trying again may succeed: timeouts, network failures, 408/409/425/429 and 5xx. An open
 * circuit, a caller abort and other 4xx are final. Reads `retryable`/`isRetryable` flags first
 * (SynapseError, AI SDK `APICallError`), then a `statusCode`/`status`, then one level of `cause`.
 */
export function isRetryableError(error: unknown, depth = 0): boolean {
	if (isSynapseError(error) && error.code === RELIABILITY_ERROR_CODES.CIRCUIT_OPEN) return false;
	if (typeof error !== "object" || error === null) return false;
	const flagged = error as {
		name?: unknown;
		retryable?: unknown;
		isRetryable?: unknown;
		statusCode?: unknown;
		status?: unknown;
		cause?: unknown;
	};
	if (flagged.name === "AbortError") return false;
	if (typeof flagged.retryable === "boolean") return flagged.retryable;
	if (typeof flagged.isRetryable === "boolean") return flagged.isRetryable;
	const status = typeof flagged.statusCode === "number" ? flagged.statusCode : flagged.status;
	if (typeof status === "number") return RETRYABLE_STATUS.has(status) || status >= SERVER_ERROR;
	// fetch rejects with a TypeError when the connection fails.
	if (error instanceof TypeError) return true;
	return depth === 0 && flagged.cause !== undefined && isRetryableError(flagged.cause, 1);
}
