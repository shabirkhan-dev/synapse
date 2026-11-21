import { describe, expect, test } from "bun:test";
import { base32Decode, hotp, totpCounter } from "@synapse/security";

import { buildTestApp } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";
const PASSPHRASE = ["a", "long", "test", "passphrase"].join(" ");
const EMAIL = "ada@example.com";

async function call(app: App, method: string, path: string, body?: unknown, token?: string) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

/** The code for `secret` at `offset` steps from now (the step just used cannot be used again). */
const code = (secret: string, offset = 0) =>
	hotp(base32Decode(secret), totpCounter(new Date()) + offset);

/** Sign up, then turn two-step sign-in on; returns the secret and recovery codes. */
async function enrolled(app: App) {
	const signUp = await call(app, "POST", "/auth/sign-up", { email: EMAIL, password: PASSPHRASE });
	const token = signUp.body.data.tokens.accessToken as string;
	const setup = await call(app, "POST", "/auth/mfa/setup", {}, token);
	const { secret, uri } = setup.body.data as { secret: string; uri: string };
	const enabled = await call(app, "POST", "/auth/mfa/enable", { code: code(secret) }, token);
	return { token, secret, uri, recoveryCodes: enabled.body.data.recoveryCodes as string[] };
}

const signIn = (app: App) =>
	call(app, "POST", "/auth/sign-in", { email: EMAIL, password: PASSPHRASE });

describe("two-step sign-in", () => {
	test("set up with a confirmed first code; the secret is stored sealed", async () => {
		const { app, mfaStore } = buildTestApp();
		const signUp = await call(app, "POST", "/auth/sign-up", { email: EMAIL, password: PASSPHRASE });
		const token = signUp.body.data.tokens.accessToken as string;
		expect((await call(app, "GET", "/auth/mfa", undefined, token)).body.data).toEqual({
			enabled: false,
			recoveryCodesLeft: 0,
		});
		const setup = await call(app, "POST", "/auth/mfa/setup", {}, token);
		const { secret, uri } = setup.body.data;
		expect(uri).toStartWith("otpauth://totp/Synapse%3Aada%40example.com?secret=");

		const wrong = await call(app, "POST", "/auth/mfa/enable", { code: "000000" }, token);
		expect(wrong.status).toBe(400);
		expect(wrong.body.error.code).toBe("AUTH_MFA_CODE_INVALID");
		const enabled = await call(app, "POST", "/auth/mfa/enable", { code: code(secret) }, token);
		expect(enabled.status).toBe(200);
		expect(enabled.body.data.recoveryCodes).toHaveLength(10);
		expect((await call(app, "GET", "/auth/mfa", undefined, token)).body.data).toEqual({
			enabled: true,
			recoveryCodesLeft: 10,
		});
		const stored = [...mfaStore.states.values()][0]?.secret ?? "";
		expect(stored).toStartWith("v1.");
		expect(stored).not.toContain(secret);
		// Setting up again needs it off first.
		expect((await call(app, "POST", "/auth/mfa/setup", {}, token)).status).toBe(409);
	});

	test("with it on, the password only earns a challenge; a fresh code finishes sign-in, once", async () => {
		const { app } = buildTestApp();
		const { secret } = await enrolled(app);
		const first = await signIn(app);
		expect(first.status).toBe(200);
		expect(first.body.data.mfaRequired).toBe(true);
		expect(first.body.data.tokens).toBeUndefined();
		const { challenge } = first.body.data;

		const wrong = await call(app, "POST", "/auth/sign-in/mfa", { challenge, code: "123456" });
		expect(wrong.status).toBe(401);
		expect(wrong.body.error.code).toBe("AUTH_MFA_CODE_INVALID");
		// The code from setup was already used; the next step's code works.
		const next = code(secret, 1);
		const done = await call(app, "POST", "/auth/sign-in/mfa", { challenge, code: next });
		expect(done.status).toBe(200);
		expect(done.body.data.tokens.accessToken).toBeString();
		expect(done.body.data.user.email).toBe(EMAIL);
		// The same code cannot be replayed.
		const replay = await call(app, "POST", "/auth/sign-in/mfa", { challenge, code: next });
		expect(replay.status).toBe(401);

		const forged = await call(app, "POST", "/auth/sign-in/mfa", {
			challenge: `${challenge}x`,
			code: code(secret),
		});
		expect(forged.status).toBe(401);
		expect(forged.body.error.code).toBe("AUTH_MFA_CHALLENGE_INVALID");
	});

	test("a recovery code works once, and turns it off", async () => {
		const { app } = buildTestApp();
		const { token, recoveryCodes } = await enrolled(app);
		const [first = "", second = ""] = recoveryCodes;
		const { challenge } = (await signIn(app)).body.data;
		const withRecovery = await call(app, "POST", "/auth/sign-in/mfa", {
			challenge,
			code: first.toUpperCase(),
		});
		expect(withRecovery.status).toBe(200);
		expect((await call(app, "POST", "/auth/sign-in/mfa", { challenge, code: first })).status).toBe(
			401,
		);
		expect(
			(await call(app, "GET", "/auth/mfa", undefined, token)).body.data.recoveryCodesLeft,
		).toBe(9);

		const off = await call(app, "POST", "/auth/mfa/disable", { code: second }, token);
		expect(off.status).toBe(200);
		expect(off.body.data).toEqual({ enabled: false, recoveryCodesLeft: 0 });
		const plain = await signIn(app);
		expect(plain.body.data.mfaRequired).toBe(false);
		expect(plain.body.data.tokens.accessToken).toBeString();
	});

	test("codes are rate-limited per user, and API keys cannot manage two-step sign-in", async () => {
		const { app } = buildTestApp();
		const { token } = await enrolled(app);
		const { challenge } = (await signIn(app)).body.data;
		const statuses: number[] = [];
		for (let attempt = 0; attempt < 5; attempt += 1) {
			// oxlint-disable-next-line no-await-in-loop -- attempts in order
			statuses.push(
				(await call(app, "POST", "/auth/sign-in/mfa", { challenge, code: "000000" })).status,
			);
		}
		expect(statuses.at(-1)).toBe(429);

		const fresh = await call(app, "POST", "/auth/sign-up", {
			email: "bob@example.com",
			password: PASSPHRASE,
		});
		const bobToken = fresh.body.data.tokens.accessToken as string;
		const { key } = (await call(app, "POST", "/auth/api-keys", { name: "ci" }, bobToken)).body.data;
		const refused = await call(app, "POST", "/auth/mfa/setup", {}, key);
		expect(refused.status).toBe(403);
		expect(refused.body.error.code).toBe("AUTH_SESSION_REQUIRED");
		expect(token).toBeString();
	});
});
