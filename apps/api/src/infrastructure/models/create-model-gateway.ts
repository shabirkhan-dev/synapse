import {
	type AiSdkModelGateway,
	createReranker as createVendorReranker,
	createModelGateway as createVendorModelGateway,
} from "@synapse/adapters/model-gateway";
import type { Reranker } from "@synapse/core/contracts";
import {
	addSpanEvent,
	instrumentModelGateway,
	instrumentReranker,
	type Logger,
} from "@synapse/observability";
import {
	createCallPolicy,
	type ReliabilityEvent,
	withModelReliability,
} from "@synapse/reliability";

import type { Configuration } from "@/config";

/**
 * The model gateway every module uses: one span per logical call (instrumentation outside), and
 * inside it each attempt with a timeout, retries, a circuit breaker and the optional fallback
 * model. Streaming chat (`chatModel`) is passed through unwrapped.
 */
export function createModelGateway(config: Configuration, logger: Logger): AiSdkModelGateway {
	const { ai } = config;
	const fallbackChat = ai.fallbackChat
		? createVendorModelGateway({ chat: ai.fallbackChat, embedding: ai.embedding }).chat
		: undefined;
	const reliable = withModelReliability(createVendorModelGateway(ai), {
		...config.reliability,
		...(fallbackChat ? { fallbackChat } : {}),
		onEvent: reportReliabilityEvent(logger),
	});
	return instrumentModelGateway(reliable, {
		logger,
		prices: config.observability.modelPrices,
	});
}

/**
 * The configured reranker, or none. One attempt within `AI_RERANK_TIMEOUT_MS` behind its own
 * circuit breaker: retrieval falls back to the fused order, so retrying would only add latency.
 */
export function createReranker(config: Configuration, logger: Logger): Reranker | undefined {
	const { rerank } = config.ai;
	if (!rerank) return undefined;
	const vendor = createVendorReranker(rerank.spec);
	const policy = createCallPolicy({
		name: "rerank",
		timeoutMs: rerank.timeoutMs,
		retry: { ...config.reliability.retry, attempts: 1 },
		breaker: config.reliability.breaker,
		onEvent: reportReliabilityEvent(logger),
	});
	return instrumentReranker(
		{
			info: vendor.info,
			rerank: (request) =>
				policy.run(
					(signal) => vendor.rerank({ ...request, ...(signal ? { abortSignal: signal } : {}) }),
					request.abortSignal,
				),
		},
		{ logger },
	);
}

/** Retries, circuit changes and fallbacks become a warning log and an event on the active span. */
export function reportReliabilityEvent(logger: Logger) {
	return (event: ReliabilityEvent) => {
		const { type, name } = event;
		if (type === "circuit") {
			logger.warn(`circuit ${event.to}`, { dependency: name, from: event.from });
			addSpanEvent(`reliability.circuit.${event.to}`, { "reliability.dependency": name });
			return;
		}
		logger.warn(`${name} ${type}`, {
			dependency: name,
			...(type === "retry" ? { attempt: event.attempt, delayMs: event.delayMs } : {}),
			error: event.error,
		});
		addSpanEvent(`reliability.${type}`, {
			"reliability.dependency": name,
			...(type === "retry" ? { "reliability.attempt": event.attempt } : {}),
		});
	};
}
