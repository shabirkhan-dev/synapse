import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { type Account, call, signUp } from "../support/client";
import { type Stack, startStack } from "../support/stack";

let stack: Stack;
let ada: Account;
let bob: Account;

beforeAll(async () => {
	stack = await startStack({ RATE_LIMIT_QUESTIONS_PER_MINUTE: "3" });
	[ada, bob] = await Promise.all([signUp("budget-ada"), signUp("budget-bob")]);
});

afterAll(() => stack?.stop());

const search = (token: string) =>
	call("/rag/query", { method: "POST", token, body: { query: "refunds", answer: false } });

describe("per-user budget on model-calling routes (postgres limiter)", () => {
	test("the fourth question in a minute is refused with Retry-After; others are unaffected", async () => {
		for (let index = 0; index < 3; index++) {
			// oxlint-disable-next-line no-await-in-loop -- the window counts requests in order
			expect((await search(ada.accessToken)).status).toBe(200);
		}
		const limited = await search(ada.accessToken);
		expect(limited.status).toBe(429);
		expect(limited.body.error?.code).toBe("RATE_LIMITED");
		expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
		expect((await search(bob.accessToken)).status).toBe(200);
	});
});
