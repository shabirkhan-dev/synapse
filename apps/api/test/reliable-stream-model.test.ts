import { describe, expect, test } from "bun:test";
import type { LanguageModelV4, LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";

import { withStreamReliability as wrapStream } from "@synapse/adapters/model-gateway";
import { SynapseError } from "@synapse/core/errors";
import { type CallPolicy, createCallPolicy, RELIABILITY_ERROR_CODES } from "@synapse/reliability";

import { streamResult, textStreamParts } from "./helpers";

const policy = (attempts = 1, failureThreshold = 5) =>
	createCallPolicy({
		name: "chat",
		timeoutMs: 200,
		retry: { attempts, baseDelayMs: 1, maxDelayMs: 1 },
		breaker: { failureThreshold, resetAfterMs: 60_000 },
	});

const params = {
	prompt: [{ role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }],
};

async function readAll(model: LanguageModelV4): Promise<LanguageModelV4StreamPart[]> {
	const { stream } = await model.doStream(params);
	const parts: LanguageModelV4StreamPart[] = [];
	for await (const part of stream as unknown as AsyncIterable<LanguageModelV4StreamPart>)
		parts.push(part);
	return parts;
}

/** As `create-model-gateway.ts` wires it. */
const withStreamReliability = (
	model: MockLanguageModelV4,
	startPolicy: CallPolicy,
	idleTimeoutMs: number,
) =>
	wrapStream(model, {
		policy: startPolicy,
		idleTimeoutMs,
		idleError: (ms) =>
			new SynapseError(RELIABILITY_ERROR_CODES.TIMEOUT, `stalled ${ms} ms`, { retryable: true }),
	});

describe("withStreamReliability", () => {
	test("a normal stream passes through unchanged", async () => {
		const parts = textStreamParts("Refunds within 30 days.");
		const model = withStreamReliability(
			new MockLanguageModelV4({ doStream: async () => streamResult(parts) }),
			policy(),
			500,
		) as LanguageModelV4;
		expect(await readAll(model)).toEqual(parts);
	});

	test("a stream that stops sending ends at the idle deadline and cancels the request", async () => {
		let upstream: AbortSignal | undefined;
		const stalled = new MockLanguageModelV4({
			doStream: async (options) => {
				upstream = options.abortSignal;
				return {
					stream: new ReadableStream<LanguageModelV4StreamPart>({
						start(controller) {
							controller.enqueue({ type: "stream-start", warnings: [] });
						},
					}),
				};
			},
		});
		const model = withStreamReliability(stalled, policy(), 100) as LanguageModelV4;
		const started = performance.now();
		await expect(readAll(model)).rejects.toMatchObject({ code: RELIABILITY_ERROR_CODES.TIMEOUT });
		expect(performance.now() - started).toBeLessThan(1_000);
		expect(upstream?.aborted).toBe(true);
	});

	test("a stream that never starts times out; an open circuit refuses without calling the model", async () => {
		let calls = 0;
		const hanging = new MockLanguageModelV4({
			doStream: () => {
				calls++;
				return new Promise(() => {});
			},
		});
		const shared = policy(1, 2);
		const model = withStreamReliability(hanging, shared, 1_000) as LanguageModelV4;
		await expect(model.doStream(params)).rejects.toMatchObject({
			code: RELIABILITY_ERROR_CODES.TIMEOUT,
		});
		// The second timeout opens the circuit (reported as open), and the third never calls the model.
		await expect(model.doStream(params)).rejects.toMatchObject({
			code: RELIABILITY_ERROR_CODES.CIRCUIT_OPEN,
		});
		expect(shared.state).toBe("open");
		await expect(model.doStream(params)).rejects.toMatchObject({
			code: RELIABILITY_ERROR_CODES.CIRCUIT_OPEN,
		});
		expect(calls).toBe(2);
	});
});
