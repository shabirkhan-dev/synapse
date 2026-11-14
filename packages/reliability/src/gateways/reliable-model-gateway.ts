import type { ChatGateway, ModelGateway, TextGenerationRequest } from "@synapse/core/contracts";
import { isSynapseError } from "@synapse/core/errors";

import {
	type CallPolicy,
	createCallPolicy,
	type CallPolicyOptions,
	type ReliabilityEvent,
} from "../policies/call-policy";
import { RELIABILITY_ERROR_CODES } from "../errors";
import { isRetryableError } from "../retry/is-retryable";

type PolicySettings = Pick<CallPolicyOptions, "retry" | "breaker" | "now" | "sleep" | "random">;

/** The type of a gateway's raw streaming model (e.g. the AI SDK `chatModel`), if it has one. */
type ChatModelOf<TGateway> = TGateway extends { chatModel: infer TModel } ? TModel : never;

export type ModelReliabilityOptions<TChatModel = never> = PolicySettings & {
	chatTimeoutMs: number;
	embeddingTimeoutMs: number;
	/** Used when the primary chat model is down (retries exhausted or circuit open). */
	fallbackChat?: ChatGateway;
	onEvent?: (event: ReliabilityEvent) => void;
	/**
	 * Wraps the gateway's raw streaming model with the chat policy, so streams share the `chat`
	 * timeout, retries and circuit breaker. Vendor-specific, so the caller supplies it.
	 */
	wrapChatModel?: (model: TChatModel, chatPolicy: CallPolicy) => TChatModel;
};

/**
 * Wrap a `ModelGateway` so chat and embedding calls get a timeout per attempt, retries with
 * backoff and their own circuit breaker; chat falls back to `fallbackChat` when configured. The
 * result names the model that answered, so provenance stays true. Extra properties are kept; the
 * gateway's `chatModel` is wrapped by `wrapChatModel` when given.
 */
export function withModelReliability<TGateway extends ModelGateway>(
	gateway: TGateway,
	{
		chatTimeoutMs,
		embeddingTimeoutMs,
		fallbackChat,
		onEvent,
		wrapChatModel,
		...settings
	}: ModelReliabilityOptions<ChatModelOf<TGateway>>,
): TGateway {
	const policy = (name: string, timeoutMs: number) =>
		createCallPolicy({ name, timeoutMs, ...settings, ...(onEvent ? { onEvent } : {}) });
	const chatPolicy = policy("chat", chatTimeoutMs);
	const embeddingPolicy = policy("embeddings", embeddingTimeoutMs);
	const fallbackPolicy = fallbackChat ? policy("chat-fallback", chatTimeoutMs) : undefined;
	const { chat, embedding } = gateway;

	const chatModel =
		wrapChatModel && "chatModel" in gateway
			? { chatModel: wrapChatModel(gateway.chatModel as ChatModelOf<TGateway>, chatPolicy) }
			: {};

	return Object.assign({}, gateway, chatModel, {
		chat: {
			info: chat.info,
			async generateText(request: TextGenerationRequest) {
				try {
					return await chatPolicy.run(generate(chat, request), request.abortSignal);
				} catch (error) {
					if (!fallbackChat || !fallbackPolicy || request.abortSignal?.aborted) throw error;
					if (!isRetryableError(error) && !isCircuitOpen(error)) throw error;
					onEvent?.({ type: "fallback", name: "chat", error });
					return fallbackPolicy.run(generate(fallbackChat, request), request.abortSignal);
				}
			},
		},
		embedding: {
			info: embedding.info,
			embed: (value: string, options: { abortSignal?: AbortSignal } = {}) =>
				embeddingPolicy.run(
					(signal) => embedding.embed(value, signal ? { abortSignal: signal } : {}),
					options.abortSignal,
				),
			embedMany: (values: string[], options: { abortSignal?: AbortSignal } = {}) =>
				embeddingPolicy.run(
					(signal) => embedding.embedMany(values, signal ? { abortSignal: signal } : {}),
					options.abortSignal,
				),
		},
	});
}

/** One chat call that uses the policy's per-attempt signal. */
function generate(target: ChatGateway, request: TextGenerationRequest) {
	return (signal?: AbortSignal) =>
		target.generateText({ ...request, ...(signal ? { abortSignal: signal } : {}) });
}

function isCircuitOpen(error: unknown): boolean {
	return isSynapseError(error) && error.code === RELIABILITY_ERROR_CODES.CIRCUIT_OPEN;
}
