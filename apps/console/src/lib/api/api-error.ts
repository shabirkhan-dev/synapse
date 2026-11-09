/** Error codes the client itself produces (the API's codes come from its error envelope). */
export const CLIENT_ERROR_CODES = {
	NETWORK_ERROR: "NETWORK_ERROR",
	INVALID_RESPONSE: "INVALID_RESPONSE",
} as const;

/** A failed API call. Branch on `code` (stable), show `message` (for people). */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details?: ReadonlyArray<unknown>;
	readonly requestId?: string;

	constructor(init: {
		status: number;
		code: string;
		message: string;
		details?: ReadonlyArray<unknown>;
		requestId?: string;
	}) {
		super(init.message);
		this.name = "ApiError";
		this.status = init.status;
		this.code = init.code;
		if (init.details) this.details = init.details;
		if (init.requestId) this.requestId = init.requestId;
	}
}

/** `{ success: false, message, error: { code, details? }, requestId }` → `ApiError`. */
export function fromErrorEnvelope(status: number, body: unknown): ApiError {
	const envelope = (body ?? {}) as {
		message?: unknown;
		error?: { code?: unknown; details?: unknown };
		requestId?: unknown;
	};
	return new ApiError({
		status,
		code: typeof envelope.error?.code === "string" ? envelope.error.code : `HTTP_${status}`,
		message: typeof envelope.message === "string" ? envelope.message : `Request failed (${status})`,
		...(Array.isArray(envelope.error?.details) ? { details: envelope.error.details } : {}),
		...(typeof envelope.requestId === "string" ? { requestId: envelope.requestId } : {}),
	});
}
