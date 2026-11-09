import {
	type AiSdkModelGateway,
	createOpenAICompatibleModelGateway,
} from "@synapse/adapters/model-gateway";
import { addSpanEvent, instrumentModelGateway, type Logger } from "@synapse/observability";
import { type ReliabilityEvent, withModelReliability } from "@synapse/reliability";

import type { Configuration } from "@/config";

/**
 * The model gateway every module uses: one span per logical call (instrumentation outside), and
 * inside it each attempt with a timeout, retries, a circuit breaker and the optional fallback
 * model. Streaming chat (`chatModel`) is passed through unwrapped.
 */
export function createModelGateway(config: Configuration, logger: Logger): AiSdkModelGateway {
	const { reliability } = config;
	const fallbackChat = reliability.fallbackChatModel
		? createOpenAICompatibleModelGateway({ ...config.ai, chatModel: reliability.fallbackChatModel })
				.chat
		: undefined;
	const reliable = withModelReliability(createOpenAICompatibleModelGateway(config.ai), {
		...reliability,
		...(fallbackChat ? { fallbackChat } : {}),
		onEvent: reportReliabilityEvent(logger),
	});
	return instrumentModelGateway(reliable, {
		logger,
		prices: config.observability.modelPrices,
	});
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
