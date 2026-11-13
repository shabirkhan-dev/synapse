import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { type Account, call, signUp } from "../support/client";
import { PASSWORD } from "../support/env";
import { type Stack, startStack } from "../support/stack";

let stack: Stack;
let ada: Account;

beforeAll(async () => {
	stack = await startStack();
	ada = await signUp("chaos-db");
});

afterAll(async () => {
	stack?.database.restore();
	await stack?.stop();
});

/** Time a request, so a hang fails the test instead of passing late. */
async function timed<T>(run: () => Promise<T>): Promise<{ result: T; ms: number }> {
	const started = performance.now();
	const result = await run();
	return { result, ms: performance.now() - started };
}

async function waitUntilReady(timeoutMs: number): Promise<number> {
	const started = performance.now();
	while (performance.now() - started < timeoutMs) {
		// oxlint-disable-next-line no-await-in-loop -- polling until the API recovers
		if ((await call("/health/ready")).status === 200) return performance.now() - started;
		// oxlint-disable-next-line no-await-in-loop -- polling interval
		await Bun.sleep(250);
	}
	throw new Error(`not ready after ${timeoutMs} ms`);
}

describe("Postgres goes away", () => {
	test("liveness stays up, readiness and requests fail fast with the envelope", async () => {
		expect((await call("/health/ready")).status).toBe(200);
		stack.database.cut();

		const live = await call("/health");
		expect(live.status).toBe(200);

		const ready = await timed(() => call("/health/ready"));
		expect(ready.result.status).toBe(503);
		expect(ready.result.body.error?.code).toBe("DATABASE_UNAVAILABLE");
		expect(ready.ms).toBeLessThan(5_000);

		const documents = await timed(() => call("/rag/documents", { token: ada.accessToken }));
		expect(documents.result.status).toBeGreaterThanOrEqual(500);
		expect(documents.result.body.success).toBe(false);
		expect(JSON.stringify(documents.result.body)).not.toMatch(/ECONN|postgres|\bat .+:\d+/i);
		expect(documents.ms).toBeLessThan(5_000);
	});

	test("the API recovers on its own once Postgres is back", async () => {
		stack.database.restore();
		expect(await waitUntilReady(10_000)).toBeLessThan(10_000);

		expect((await call("/rag/documents", { token: ada.accessToken })).status).toBe(200);
		const signIn = await call("/auth/sign-in", {
			method: "POST",
			body: { email: ada.email, password: PASSWORD },
		});
		expect(signIn.status).toBe(200);
	});
});
