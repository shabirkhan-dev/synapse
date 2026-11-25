import { describe, expect, test } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { authorizationUrl, createPkce, verifyIdToken } from "../src";

const issuer = "https://idp.example.com";
const clientId = "synapse";
const nonce = "n-123";

async function provider(alg: "RS256" | "ES256" = "RS256") {
	const { privateKey, publicKey } = await generateKeyPair(alg, { extractable: true });
	const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg };
	const sign = (claims: Record<string, unknown>, options: { exp?: string; iss?: string } = {}) =>
		new SignJWT({ nonce, email: "Ada@Example.com", email_verified: true, ...claims })
			.setProtectedHeader({ alg, kid: "k1" })
			.setIssuer(options.iss ?? issuer)
			.setAudience((claims.aud as string | string[] | undefined) ?? clientId)
			.setSubject("user-1")
			.setIssuedAt()
			.setExpirationTime(options.exp ?? "5m")
			.sign(privateKey);
	return { keys: [jwk as Record<string, unknown>], sign };
}

describe("createPkce", () => {
	test("the challenge is the S256 of the verifier", () => {
		const { verifier, challenge } = createPkce();
		expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(challenge).toBe(new Bun.CryptoHasher("sha256").update(verifier).digest("base64url"));
		expect(createPkce().verifier).not.toBe(verifier);
	});
});

describe("authorizationUrl", () => {
	test("asks for a code with PKCE, the nonce, and openid email", () => {
		const url = new URL(
			authorizationUrl({
				authorizationEndpoint: "https://idp.example.com/authorize?tenant=a",
				clientId,
				redirectUri: "https://console.example.com/sso/callback",
				state: "s",
				nonce,
				codeChallenge: "c",
				loginHint: "ada@example.com",
			}),
		);
		expect(url.searchParams.get("tenant")).toBe("a");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("scope")).toBe("openid email");
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(url.searchParams.get("nonce")).toBe(nonce);
		expect(url.searchParams.get("login_hint")).toBe("ada@example.com");
	});
});

describe("verifyIdToken", () => {
	test("accepts a token signed by the provider (RS256 and ES256)", async () => {
		for (const alg of ["RS256", "ES256"] as const) {
			// oxlint-disable-next-line no-await-in-loop -- one algorithm at a time
			const { keys, sign } = await provider(alg);
			// oxlint-disable-next-line no-await-in-loop
			const identity = await verifyIdToken(await sign({}), { keys, issuer, clientId, nonce });
			expect(identity).toEqual({ subject: "user-1", email: "ada@example.com" });
		}
	});

	test("an unverified email is not trusted", async () => {
		const { keys, sign } = await provider();
		const token = await sign({ email_verified: false });
		expect((await verifyIdToken(token, { keys, issuer, clientId, nonce })).email).toBeNull();
	});

	test("refuses the wrong issuer, audience, nonce, an expired token or another key", async () => {
		const { keys, sign } = await provider();
		const other = await provider();
		const cases = [
			await sign({}, { iss: "https://evil.example.com" }),
			await sign({ aud: "someone-else" }),
			await sign({ nonce: "replayed" }),
			await sign({}, { exp: "-10m" }),
			await other.sign({}),
			await sign({ aud: [clientId, "other"], azp: "other" }),
		];
		for (const token of cases) {
			// oxlint-disable-next-line no-await-in-loop -- each case on its own
			await expect(verifyIdToken(token, { keys, issuer, clientId, nonce })).rejects.toMatchObject({
				code: "AUTH_SSO_ID_TOKEN_INVALID",
			});
		}
	});

	test("refuses alg none and HMAC tokens", async () => {
		const { keys } = await provider();
		const body = Buffer.from(
			JSON.stringify({ iss: issuer, aud: clientId, sub: "x", nonce, exp: 9e9, iat: 1 }),
		).toString("base64url");
		const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${body}.`;
		const hmac = await new SignJWT({ nonce })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuer(issuer)
			.setAudience(clientId)
			.setSubject("x")
			.setIssuedAt()
			.setExpirationTime("5m")
			.sign(new TextEncoder().encode("a-shared-client-secret-of-32-bytes!"));
		for (const token of [none, hmac]) {
			// oxlint-disable-next-line no-await-in-loop
			await expect(verifyIdToken(token, { keys, issuer, clientId, nonce })).rejects.toMatchObject({
				code: "AUTH_SSO_ID_TOKEN_INVALID",
			});
		}
	});
});
