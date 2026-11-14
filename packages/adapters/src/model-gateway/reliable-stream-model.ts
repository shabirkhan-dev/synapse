import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { type LanguageModel, wrapLanguageModel } from "ai";

/** A call policy as `@synapse/reliability` defines it, seen structurally (no dependency on it). */
export type StreamStartPolicy = {
	run<T>(call: (signal: AbortSignal | undefined) => Promise<T>, signal?: AbortSignal): Promise<T>;
};

export type StreamReliabilityOptions = {
	/** Starting a stream runs through it: per-attempt timeout, retries, circuit breaker. */
	policy: StreamStartPolicy;
	/** Longest gap between stream parts before the reply is ended. */
	idleTimeoutMs: number;
	/** The error a stalled stream ends with (e.g. `RELIABILITY_TIMEOUT`). */
	idleError: (idleTimeoutMs: number) => Error;
};

/** Ends a stream that sends nothing for `idleTimeoutMs`, and cancels its request. */
function idleDeadline(
	{ idleTimeoutMs, idleError }: StreamReliabilityOptions,
	cancel: AbortController,
) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const arm = (controller: TransformStreamDefaultController<LanguageModelV4StreamPart>) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			const error = idleError(idleTimeoutMs);
			cancel.abort(error);
			controller.error(error);
		}, idleTimeoutMs);
	};
	const transformer: Transformer<LanguageModelV4StreamPart, LanguageModelV4StreamPart> & {
		/** Runs when the reader cancels (Streams spec; missing from TypeScript's lib types). */
		cancel: () => void;
	} = {
		start: arm,
		transform(part, controller) {
			arm(controller);
			controller.enqueue(part);
		},
		flush: () => clearTimeout(timer),
		cancel: () => clearTimeout(timer),
	};
	return new TransformStream(transformer);
}

/**
 * The streaming chat model behind a call policy: starting a stream gets its timeout, retries and
 * circuit breaker; once it runs, an idle deadline between parts. Failures after the stream started
 * do not count toward the breaker.
 */
export function withStreamReliability(
	model: LanguageModel,
	options: StreamReliabilityOptions,
): LanguageModel {
	if (typeof model === "string") return model;
	return wrapLanguageModel({
		model,
		middleware: {
			specificationVersion: "v4",
			async wrapStream({ params, model: inner }) {
				const idle = new AbortController();
				const result = await options.policy.run(
					(attempt) =>
						Promise.resolve(
							inner.doStream({
								...params,
								abortSignal: AbortSignal.any(
									[attempt, idle.signal, params.abortSignal].filter(
										(signal): signal is AbortSignal => signal !== undefined,
									),
								),
							}),
						),
					params.abortSignal,
				);
				return { ...result, stream: result.stream.pipeThrough(idleDeadline(options, idle)) };
			},
		},
	});
}
