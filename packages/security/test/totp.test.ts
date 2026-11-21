import { describe, expect, test } from "bun:test";

import {
	base32Decode,
	createAccessTokens,
	createMfaChallenges,
	base32Encode,
	createRecoveryCodes,
	createTotpSecret,
	hotp,
	normalizeRecoveryCode,
	openSecret,
	sealSecret,
	totpCounter,
	totpUri,
	verifyTotp,
} from "../src";

// RFC 6238 appendix B: the SHA-1 seed and its 8-digit codes.
const SEED = new TextEncoder().encode("12345678901234567890");
const RFC_6238_SHA1: Array<[number, string]> = [
	[59, "94287082"],
	[1111111109, "07081804"],
	[1111111111, "14050471"],
	[1234567890, "89005924"],
	[2000000000, "69279037"],
	[20000000000, "65353130"],
];

describe("TOTP (RFC 6238)", () => {
	test("matches the RFC's SHA-1 test vectors", () => {
		for (const [seconds, code] of RFC_6238_SHA1) {
			expect(hotp(SEED, totpCounter(new Date(seconds * 1000)), 8)).toBe(code);
		}
	});

	test("base32 round-trips; RFC 4648 vector", () => {
		expect(base32Encode(new TextEncoder().encode("foobar"))).toBe("MZXW6YTBOI");
		expect(new TextDecoder().decode(base32Decode("mzxw 6ytb-oi"))).toBe("foobar");
		const secret = createTotpSecret();
		expect(secret).toMatch(/^[A-Z2-7]{32}$/);
		expect(base32Encode(base32Decode(secret))).toBe(secret);
	});

	test("accepts the current code and one step either side, once; refuses others", () => {
		const secret = base32Encode(SEED);
		const at = new Date(1111111111 * 1000);
		const now = totpCounter(at);
		const code = (counter: number) => hotp(SEED, counter);
		expect(verifyTotp(secret, code(now), at)).toBe(now);
		expect(verifyTotp(secret, ` ${code(now - 1).slice(0, 3)} ${code(now - 1).slice(3)} `, at)).toBe(
			now - 1,
		);
		expect(verifyTotp(secret, code(now + 1), at)).toBe(now + 1);
		expect(verifyTotp(secret, code(now - 2), at)).toBeNull();
		// A code already used (its counter) does not work twice.
		expect(verifyTotp(secret, code(now), at, { after: now })).toBeNull();
		expect(verifyTotp(secret, "12345", at)).toBeNull();
		expect(verifyTotp(secret, "abcdef", at)).toBeNull();
	});

	test("the otpauth link carries issuer, account and secret", () => {
		const uri = totpUri({ issuer: "Synapse", account: "ada@example.com", secret: "MZXW6YTBOI" });
		expect(uri).toStartWith("otpauth://totp/Synapse%3Aada%40example.com?");
		const params = new URL(uri).searchParams;
		expect(params.get("secret")).toBe("MZXW6YTBOI");
		expect(params.get("issuer")).toBe("Synapse");
		expect(params.get("digits")).toBe("6");
	});

	test("recovery codes are distinct and compared without dashes or case", () => {
		const codes = createRecoveryCodes();
		expect(codes).toHaveLength(10);
		expect(new Set(codes).size).toBe(10);
		for (const code of codes) expect(code).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
		expect(normalizeRecoveryCode(" ABCDE-fghjk ")).toBe("abcdefghjk");
	});
});

describe("secret box", () => {
	const key = new Uint8Array(32).fill(7);
	test("seals and opens; another key or a tampered box fails", () => {
		const sealed = sealSecret("MZXW6YTBOI", key);
		expect(sealed).toStartWith("v1.");
		expect(sealed).not.toContain("MZXW6YTBOI");
		expect(openSecret(sealed, key)).toBe("MZXW6YTBOI");
		expect(() => openSecret(sealed, new Uint8Array(32).fill(8))).toThrow();
		const [v, iv, tag, body = ""] = sealed.split(".");
		const flipped = `${body[0] === "A" ? "B" : "A"}${body.slice(1)}`;
		expect(() => openSecret([v, iv, tag, flipped].join("."), key)).toThrow();
	});
});

describe("MFA challenge", () => {
	const secret = ["test", "signing", "key"].join("-").repeat(3);
	test("verifies its own challenges only; never an access token, nor the other way round", async () => {
		const challenges = createMfaChallenges(secret);
		const access = createAccessTokens({ secret, ttlSeconds: 900 });
		const challenge = await challenges.issue("user-1");
		expect(await challenges.verify(challenge)).toBe("user-1");
		const { token } = await access.issue({ sub: "user-1", sid: "s1" });
		await expect(challenges.verify(token)).rejects.toMatchObject({
			code: "AUTH_MFA_CHALLENGE_INVALID",
		});
		await expect(access.verify(challenge)).rejects.toMatchObject({
			code: "AUTH_ACCESS_TOKEN_INVALID",
		});
	});

	test("expires after five minutes", async () => {
		const challenges = createMfaChallenges(secret);
		const old = await challenges.issue("user-1", new Date(Date.now() - 301_000));
		await expect(challenges.verify(old)).rejects.toMatchObject({
			code: "AUTH_MFA_CHALLENGE_INVALID",
		});
	});
});
