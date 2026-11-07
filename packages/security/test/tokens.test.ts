import { describe, expect, test } from "bun:test";

import { SynapseError } from "@synapse/core/errors";
import { SignJWT } from "jose";

import { createAccessTokens, createRefreshToken, hashRefreshToken } from "../src";

const secret = "s".repeat(40);
const tokens = createAccessTokens({ secret, ttlSeconds: 900 });

describe("access tokens", () => {
	test("round-trips sub and sid with the configured lifetime", async () => {
		const now = new Date(Math.floor(Date.now() / 1000) * 1000);
		const { token, expiresAt } = await tokens.issue({ sub: "user-1", sid: "session-1" }, now);
		expect(expiresAt.getTime() - now.getTime()).toBe(900_000);
		expect(await tokens.verify(token)).toEqual({ sub: "user-1", sid: "session-1" });
	});

	test("rejects expired tokens, other secrets and missing claims", async () => {
		const expired = await tokens.issue(
			{ sub: "user-1", sid: "session-1" },
			new Date(Date.now() - 3_600_000),
		);
		const foreign = await createAccessTokens({ secret: "x".repeat(40), ttlSeconds: 900 }).issue({
			sub: "user-1",
			sid: "session-1",
		});
		const noSid = await new SignJWT({})
			.setProtectedHeader({ alg: "HS256" })
			.setSubject("user-1")
			.setExpirationTime("15m")
			.sign(new TextEncoder().encode(secret));
		const errors = await Promise.all(
			[expired.token, foreign.token, noSid, "not-a-jwt"].map((token) =>
				tokens.verify(token).catch((caught: unknown) => caught),
			),
		);
		for (const error of errors) {
			expect(error).toBeInstanceOf(SynapseError);
			expect((error as SynapseError).code).toBe("AUTH_ACCESS_TOKEN_INVALID");
		}
	});

	test("rejects the none algorithm", async () => {
		const unsigned = `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(
			JSON.stringify({ sub: "user-1", sid: "session-1" }),
		)}.`;
		await expect(tokens.verify(unsigned)).rejects.toBeInstanceOf(SynapseError);
	});
});

describe("refresh tokens", () => {
	test("are random, url-safe and hashed deterministically", () => {
		const token = createRefreshToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(createRefreshToken()).not.toBe(token);
		expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/);
		expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
	});
});
