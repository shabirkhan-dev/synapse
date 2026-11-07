import { describe, expect, test } from "bun:test";

import { buildTestApp, CapturingEmailSender } from "./helpers";

const base = "http://localhost/api/v1/auth";
/** Test-only passphrase (not a secret). */
const PASSPHRASE = ["correct", "horse", "battery", "staple"].join(" ");
type App = ReturnType<typeof buildTestApp>["app"];

function post(app: App, path: string, body: unknown, token?: string) {
	return app.request(`${base}${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(body),
	});
}

async function signUp(app: App, email = "ada@example.com") {
	const response = await post(app, "/sign-up", { email, password: PASSPHRASE });
	expect(response.status).toBe(201);
	return (await response.json()).data;
}

describe("email verification", () => {
	test("sign-up emails a link; the token verifies once", async () => {
		const { app, email } = buildTestApp();
		const { user } = await signUp(app);
		expect(user.emailVerifiedAt).toBeNull();
		expect(email.sent[0]).toMatchObject({
			to: "ada@example.com",
			subject: "Confirm your Synapse email",
		});
		expect(email.sent[0]?.text).toContain("http://localhost:3000/verify-email?token=");

		const token = email.lastToken("ada@example.com");
		const verified = await post(app, "/verify-email", { token });
		expect(verified.status).toBe(200);
		expect((await verified.json()).data.emailVerifiedAt).toBeString();

		const again = await post(app, "/verify-email", { token });
		expect(again.status).toBe(400);
		expect((await again.json()).error.code).toBe("AUTH_LINK_INVALID");
	});

	test("resend sends a new link, voids the old one, and stops once verified", async () => {
		const { app, email } = buildTestApp();
		const { tokens } = await signUp(app);
		const first = email.lastToken("ada@example.com");

		const resend = await post(app, "/verify-email/resend", {}, tokens.accessToken);
		expect(resend.status).toBe(202);
		expect((await resend.json()).message).toBe("Verification email sent");
		const second = email.lastToken("ada@example.com");
		expect(second).not.toBe(first);
		expect((await post(app, "/verify-email", { token: first })).status).toBe(400);
		expect((await post(app, "/verify-email", { token: second })).status).toBe(200);

		const done = await post(app, "/verify-email/resend", {}, tokens.accessToken);
		expect((await done.json()).message).toBe("Email already verified");
		expect((await post(app, "/verify-email/resend", {})).status).toBe(401);
	});
});

describe("email delivery failures", () => {
	test("sign-up still succeeds when the provider fails (user can resend later)", async () => {
		class FailingEmailSender extends CapturingEmailSender {
			override async send(): Promise<void> {
				throw new Error("provider down");
			}
		}
		const { app } = buildTestApp({ email: new FailingEmailSender() });
		const { user } = await signUp(app);
		expect(user.email).toBe("ada@example.com");
	});
});

describe("password reset", () => {
	test("gives the same answer for unknown emails and sends nothing", async () => {
		const { app, email } = buildTestApp();
		const response = await post(app, "/password/forgot", { email: "nobody@example.com" });
		expect(response.status).toBe(202);
		expect((await response.json()).message).toBe(
			"If an account exists for this email, a reset link is on its way",
		);
		expect(email.sent).toEqual([]);
	});

	test("resets the password once, signs out every session and verifies the email", async () => {
		const { app, email } = buildTestApp();
		const { tokens } = await signUp(app);
		const forgot = await post(app, "/password/forgot", { email: "ADA@example.com" });
		expect(forgot.status).toBe(202);
		const message = email.sent.at(-1);
		expect(message?.subject).toBe("Reset your Synapse password");
		const token = email.lastToken("ada@example.com");

		const newPassphrase = ["a", "whole", "new", "passphrase"].join(" ");
		const reset = await post(app, "/password/reset", { token, password: newPassphrase });
		expect(reset.status).toBe(200);
		expect((await post(app, "/password/reset", { token, password: newPassphrase })).status).toBe(
			400,
		);

		expect((await post(app, "/refresh", { refreshToken: tokens.refreshToken })).status).toBe(401);
		expect(
			(await post(app, "/sign-in", { email: "ada@example.com", password: PASSPHRASE })).status,
		).toBe(401);
		const signIn = await post(app, "/sign-in", {
			email: "ada@example.com",
			password: newPassphrase,
		});
		expect(signIn.status).toBe(200);
		expect((await signIn.json()).data.user.emailVerifiedAt).toBeString();
	});

	test("rejects weak new passwords and made-up tokens", async () => {
		const { app } = buildTestApp();
		expect((await post(app, "/password/reset", { token: "x", password: "short" })).status).toBe(
			422,
		);
		const made = await post(app, "/password/reset", { token: "made-up", password: PASSPHRASE });
		expect(made.status).toBe(400);
	});
});

describe("rate limits", () => {
	test("sign-in is limited per email, before the password is checked", async () => {
		const { app } = buildTestApp();
		await signUp(app);
		const attempt = () =>
			post(app, "/sign-in", { email: "ada@example.com", password: "wrong guess" });
		const statuses: number[] = [];
		for (let i = 0; i < 11; i++) {
			// Sequential on purpose: each attempt must see the previous count.
			// oxlint-disable-next-line no-await-in-loop
			statuses.push((await attempt()).status);
		}
		expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
		expect(statuses[10]).toBe(429);

		// Even the right password is refused while limited.
		const right = await post(app, "/sign-in", { email: "ada@example.com", password: PASSPHRASE });
		expect(right.status).toBe(429);
		const body = await right.json();
		expect(body.error.code).toBe("AUTH_RATE_LIMITED");
		expect(body.error.details[0].retryAfterSeconds).toBeGreaterThan(0);
	});

	test("password reset requests are limited per email", async () => {
		const { app } = buildTestApp();
		const statuses = [];
		for (let i = 0; i < 6; i++) {
			// oxlint-disable-next-line no-await-in-loop
			statuses.push((await post(app, "/password/forgot", { email: "ada@example.com" })).status);
		}
		expect(statuses).toEqual([202, 202, 202, 202, 202, 429]);
	});
});
