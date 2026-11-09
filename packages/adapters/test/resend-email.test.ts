import { describe, expect, test } from "bun:test";

import { SynapseError } from "@synapse/core/errors";

import { createResendEmailSender } from "../src/email";

type Call = { url: string; init: RequestInit };

function fakeFetch(response: Response, calls: Call[]): typeof fetch {
	return Object.assign(
		async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(url), init: init ?? {} });
			return response;
		},
		{ preconnect: fetch.preconnect },
	);
}

const message = { to: "ada@example.com", subject: "Hi", text: "Hello" };

describe("resend email sender", () => {
	test("posts the message with bearer auth", async () => {
		const calls: Call[] = [];
		const sender = createResendEmailSender({
			apiKey: "re_test",
			from: "Synapse <auth@example.com>",
			fetch: fakeFetch(new Response(JSON.stringify({ id: "1" }), { status: 200 }), calls),
		});
		await sender.send(message);
		expect(calls[0]?.url).toBe("https://api.resend.com/emails");
		expect(new Headers(calls[0]?.init.headers).get("authorization")).toBe("Bearer re_test");
		expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
			from: "Synapse <auth@example.com>",
			to: ["ada@example.com"],
			subject: "Hi",
			text: "Hello",
		});
		expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
	});

	test("turns a rejection into EMAIL_SEND_FAILED with the provider's reason", async () => {
		const sender = createResendEmailSender({
			apiKey: "re_test",
			from: "x@example.com",
			fetch: fakeFetch(new Response("domain not verified", { status: 403 }), []),
		});
		const error = await sender.send(message).catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(SynapseError);
		expect(error).toMatchObject({
			code: "EMAIL_SEND_FAILED",
			details: ["domain not verified"],
			retryable: false,
		});
	});

	test("marks rate limits and provider errors as retryable", async () => {
		for (const status of [429, 503]) {
			const sender = createResendEmailSender({
				apiKey: "re_test",
				from: "x@example.com",
				fetch: fakeFetch(new Response("busy", { status }), []),
			});
			// oxlint-disable-next-line no-await-in-loop
			await expect(sender.send(message)).rejects.toMatchObject({ retryable: true });
		}
	});

	test("turns network failures into EMAIL_SEND_FAILED", async () => {
		const failing = Object.assign(
			async () => {
				throw new TypeError("connection refused");
			},
			{ preconnect: fetch.preconnect },
		);
		const sender = createResendEmailSender({ apiKey: "k", from: "x@example.com", fetch: failing });
		await expect(sender.send(message)).rejects.toMatchObject({
			code: "EMAIL_SEND_FAILED",
			retryable: true,
		});
	});
});
