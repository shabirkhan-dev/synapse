import { describe, expect, test } from "bun:test";

import type { ModelGateway } from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

import {
	createCallPolicy,
	createCircuitBreaker,
	isRetryableError,
	type ReliabilityEvent,
	retry,
	withModelReliability,
	withTimeout,
} from "../src";

const httpError = (statusCode: number) =>
	Object.assign(new Error(`http ${statusCode}`), { statusCode });
const never = () => new Promise<never>(() => {});
const failing = async () => {
	throw httpError(503);
};

/** A fake clock: `sleep` advances time instantly and records the delays. */
function fakeClock() {
	let time = 0;
	const sleeps: number[] = [];
	return {
		now: () => time,
		advance: (ms: number) => {
			time += ms;
		},
		sleep: async (ms: number) => {
			sleeps.push(ms);
			time += ms;
		},
		random: () => 1,
		sleeps,
	};
}

describe("withTimeout", () => {
	test("a hanging call rejects at the deadline and its signal is aborted", async () => {
		let seen: AbortSignal | undefined;
		const call = withTimeout(
			(signal) => {
				seen = signal;
				return never();
			},
			{ timeoutMs: 20, name: "chat" },
		);
		await expect(call).rejects.toMatchObject({ code: "RELIABILITY_TIMEOUT", retryable: true });
		expect(seen?.aborted).toBe(true);
	});

	test("a caller abort is passed through, not turned into a timeout", async () => {
		const controller = new AbortController();
		const call = withTimeout(
			(signal) =>
				new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
			{ timeoutMs: 1_000, signal: controller.signal },
		);
		controller.abort(new Error("client left"));
		await expect(call).rejects.toThrow("client left");
	});

	test("a fast call resolves", async () => {
		expect(await withTimeout(async () => 42, { timeoutMs: 1_000 })).toBe(42);
	});
});

describe("isRetryableError", () => {
	test("timeouts, network errors, 429 and 5xx retry; other 4xx, aborts and open circuits do not", () => {
		expect(isRetryableError(httpError(503))).toBe(true);
		expect(isRetryableError(httpError(429))).toBe(true);
		expect(isRetryableError(new TypeError("fetch failed"))).toBe(true);
		expect(isRetryableError(new SynapseError("X", "x", { retryable: true }))).toBe(true);
		expect(isRetryableError(Object.assign(new Error("ai sdk"), { isRetryable: true }))).toBe(true);
		expect(isRetryableError(new Error("wrapped", { cause: httpError(502) }))).toBe(true);
		expect(isRetryableError(httpError(400))).toBe(false);
		expect(isRetryableError(httpError(401))).toBe(false);
		expect(isRetryableError(new DOMException("aborted", "AbortError"))).toBe(false);
		expect(isRetryableError(new SynapseError("RELIABILITY_CIRCUIT_OPEN", "open"))).toBe(false);
		expect(isRetryableError(new Error("bug"))).toBe(false);
	});
});

describe("retry", () => {
	test("a transient 5xx is retried with exponential backoff, then succeeds", async () => {
		const clock = fakeClock();
		let calls = 0;
		const result = await retry(
			async () => {
				calls += 1;
				if (calls < 3) throw httpError(503);
				return "ok";
			},
			{ attempts: 4, baseDelayMs: 100, maxDelayMs: 150, sleep: clock.sleep, random: clock.random },
		);
		expect(result).toBe("ok");
		expect(calls).toBe(3);
		expect(clock.sleeps).toEqual([100, 150]);
	});

	test("a final error is thrown at once; attempts are bounded", async () => {
		const clock = fakeClock();
		let calls = 0;
		const options = { attempts: 3, baseDelayMs: 10, maxDelayMs: 10, sleep: clock.sleep };
		await expect(
			retry(async () => {
				calls += 1;
				throw httpError(400);
			}, options),
		).rejects.toThrow("http 400");
		expect(calls).toBe(1);

		calls = 0;
		await expect(
			retry(async () => {
				calls += 1;
				throw httpError(500);
			}, options),
		).rejects.toThrow("http 500");
		expect(calls).toBe(3);
	});
});

describe("circuit breaker", () => {
	test("opens after repeated failures, fails fast, then closes after a good trial call", async () => {
		const clock = fakeClock();
		const changes: string[] = [];
		const breaker = createCircuitBreaker({
			name: "chat",
			failureThreshold: 2,
			resetAfterMs: 1_000,
			now: clock.now,
			onStateChange: ({ to }) => changes.push(to),
		});
		await expect(breaker.run(failing)).rejects.toThrow("http 503");
		await expect(breaker.run(failing)).rejects.toThrow("http 503");
		expect(breaker.state).toBe("open");

		let called = false;
		await expect(
			breaker.run(async () => {
				called = true;
			}),
		).rejects.toMatchObject({ code: "RELIABILITY_CIRCUIT_OPEN" });
		expect(called).toBe(false);

		clock.advance(1_000);
		await expect(breaker.run(failing)).rejects.toThrow("http 503");
		expect(breaker.state).toBe("open");

		clock.advance(1_000);
		expect(await breaker.run(async () => "back")).toBe("back");
		expect(breaker.state).toBe("closed");
		expect(changes).toEqual(["open", "half-open", "open", "half-open", "closed"]);
	});

	test("client errors do not count as the dependency failing", async () => {
		const breaker = createCircuitBreaker({
			name: "chat",
			failureThreshold: 1,
			resetAfterMs: 1_000,
		});
		await expect(
			breaker.run(async () => {
				throw httpError(400);
			}),
		).rejects.toThrow();
		expect(breaker.state).toBe("closed");
	});

	test("only one trial call runs while half-open", async () => {
		const clock = fakeClock();
		const breaker = createCircuitBreaker({
			name: "chat",
			failureThreshold: 1,
			resetAfterMs: 10,
			now: clock.now,
		});
		await expect(
			breaker.run(async () => {
				throw httpError(503);
			}),
		).rejects.toThrow();
		clock.advance(10);
		const { promise, resolve } = Promise.withResolvers<string>();
		const trial = breaker.run(() => promise);
		await expect(breaker.run(async () => "second")).rejects.toMatchObject({
			code: "RELIABILITY_CIRCUIT_OPEN",
		});
		resolve("first");
		expect(await trial).toBe("first");
	});
});

describe("call policy", () => {
	test("retries stop once the breaker opens", async () => {
		const clock = fakeClock();
		const events: ReliabilityEvent[] = [];
		const policy = createCallPolicy({
			name: "chat",
			timeoutMs: 1_000,
			retry: { attempts: 5, baseDelayMs: 10, maxDelayMs: 10 },
			breaker: { failureThreshold: 2, resetAfterMs: 60_000 },
			now: clock.now,
			sleep: clock.sleep,
			onEvent: (event) => events.push(event),
		});
		let calls = 0;
		await expect(
			policy.run(async () => {
				calls += 1;
				throw httpError(502);
			}),
		).rejects.toMatchObject({ code: "RELIABILITY_CIRCUIT_OPEN" });
		expect(calls).toBe(2);
		expect(policy.state).toBe("open");
		// It stops as soon as the circuit opens: no backoff wait for a call that cannot run.
		expect(events.map((e) => e.type)).toEqual(["retry", "circuit"]);
		expect(clock.sleeps).toHaveLength(1);
	});

	test("each attempt has its own deadline", async () => {
		const policy = createCallPolicy({
			name: "embeddings",
			timeoutMs: 20,
			retry: { attempts: 2, baseDelayMs: 0, maxDelayMs: 0 },
			breaker: { failureThreshold: 10, resetAfterMs: 1_000 },
		});
		let calls = 0;
		const result = await policy.run(async () => {
			calls += 1;
			return calls === 1 ? never() : "second try";
		});
		expect(result).toBe("second try");
	});
});

const info = (model: string) => ({ provider: "test", model });
const reply = (model: string) => ({ text: `from ${model}`, model: info(model), usage: {} });

function gateway(generate: () => Promise<ReturnType<typeof reply>>): ModelGateway & { extra: 1 } {
	return {
		extra: 1,
		chat: { info: info("primary"), generateText: generate },
		embedding: {
			info: info("embed"),
			embed: async () => [1],
			embedMany: async (v) => v.map(() => [1]),
		},
	};
}

const settings = (clock: ReturnType<typeof fakeClock>) => ({
	chatTimeoutMs: 1_000,
	embeddingTimeoutMs: 1_000,
	retry: { attempts: 2, baseDelayMs: 10, maxDelayMs: 10 },
	breaker: { failureThreshold: 3, resetAfterMs: 60_000 },
	now: clock.now,
	sleep: clock.sleep,
});

describe("withModelReliability", () => {
	test("falls back when the primary is down, and the result names the fallback model", async () => {
		const events: string[] = [];
		const reliable = withModelReliability(
			gateway(async () => {
				throw httpError(503);
			}),
			{
				...settings(fakeClock()),
				fallbackChat: { info: info("fallback"), generateText: async () => reply("fallback") },
				onEvent: (event) => events.push(event.type),
			},
		);
		const result = await reliable.chat.generateText({ prompt: "hi" });
		expect(result.model).toEqual(info("fallback"));
		expect(events).toEqual(["retry", "fallback"]);
		expect(reliable.extra).toBe(1);
	});

	test("a bad request is not sent to the fallback", async () => {
		let fallbackCalls = 0;
		const reliable = withModelReliability(
			gateway(async () => {
				throw httpError(400);
			}),
			{
				...settings(fakeClock()),
				fallbackChat: {
					info: info("fallback"),
					generateText: async () => {
						fallbackCalls += 1;
						return reply("fallback");
					},
				},
			},
		);
		await expect(reliable.chat.generateText({ prompt: "hi" })).rejects.toThrow("http 400");
		expect(fallbackCalls).toBe(0);
	});

	test("embeddings retry a transient failure", async () => {
		let calls = 0;
		const base = gateway(async () => reply("primary"));
		base.embedding.embed = async () => {
			calls += 1;
			if (calls === 1) throw new TypeError("fetch failed");
			return [0.5];
		};
		const reliable = withModelReliability(base, settings(fakeClock()));
		expect(await reliable.embedding.embed("x")).toEqual([0.5]);
		expect(calls).toBe(2);
	});
});
