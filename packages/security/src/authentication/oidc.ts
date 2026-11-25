import { createLocalJWKSet, type JSONWebKeySet, jwtVerify } from "jose";

import { SynapseError } from "@synapse/core/errors";

import { SECURITY_ERROR_CODES } from "./security-error-codes";

/** Asymmetric only: `none` and HMAC (keyed with the client secret) are refused. */
const ID_TOKEN_ALGORITHMS = ["RS256", "PS256", "ES256", "EdDSA"];
const CLOCK_TOLERANCE_SECONDS = 60;

const random = (bytes: number) =>
	Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");

/** PKCE (RFC 7636, S256): the verifier stays with us, the challenge goes to the provider. */
export function createPkce(): { verifier: string; challenge: string } {
	const verifier = random(32);
	const challenge = new Bun.CryptoHasher("sha256").update(verifier).digest("base64url");
	return { verifier, challenge };
}

/** A fresh random value for `state` or `nonce` (256 bits, base64url). */
export function createOidcNonce(): string {
	return random(32);
}

export type AuthorizationRequest = {
	authorizationEndpoint: string;
	clientId: string;
	redirectUri: string;
	state: string;
	nonce: string;
	codeChallenge: string;
	/** Pre-fills the provider's sign-in form. */
	loginHint?: string;
};

/** The provider's sign-in URL for the authorization code flow with PKCE. */
export function authorizationUrl(request: AuthorizationRequest): string {
	const url = new URL(request.authorizationEndpoint);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", request.clientId);
	url.searchParams.set("redirect_uri", request.redirectUri);
	url.searchParams.set("scope", "openid email");
	url.searchParams.set("state", request.state);
	url.searchParams.set("nonce", request.nonce);
	url.searchParams.set("code_challenge", request.codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");
	if (request.loginHint) url.searchParams.set("login_hint", request.loginHint);
	return url.href;
}

export type IdTokenExpectations = {
	/** The provider's JWK Set `keys`. */
	keys: ReadonlyArray<Record<string, unknown>>;
	issuer: string;
	clientId: string;
	nonce: string;
	now?: Date;
};

export type VerifiedIdentity = {
	subject: string;
	/** Lowercased; present only when the provider says it verified the address. */
	email: string | null;
};

/**
 * Checks an ID token (OpenID Connect Core 3.1.3.7): signature by one of the provider's keys with an
 * asymmetric algorithm, issuer, audience (and `azp` when there are several), expiry and the nonce
 * this sign-in sent. Throws `AUTH_SSO_ID_TOKEN_INVALID` otherwise.
 */
export async function verifyIdToken(
	token: string,
	{ keys, issuer, clientId, nonce, now }: IdTokenExpectations,
): Promise<VerifiedIdentity> {
	let payload: Record<string, unknown>;
	try {
		const keySet = createLocalJWKSet({ keys } as JSONWebKeySet);
		({ payload } = await jwtVerify(token, keySet, {
			issuer,
			audience: clientId,
			algorithms: ID_TOKEN_ALGORITHMS,
			clockTolerance: CLOCK_TOLERANCE_SECONDS,
			requiredClaims: ["sub", "exp", "iat"],
			...(now ? { currentDate: now } : {}),
		}));
	} catch (error) {
		throw invalid("The ID token did not verify", error);
	}
	if (payload.nonce !== nonce) throw invalid("The ID token was not issued for this sign-in");
	const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
	if (audiences.length > 1 && payload.azp !== clientId) {
		throw invalid("The ID token names another authorized party");
	}
	const email =
		typeof payload.email === "string" && payload.email_verified === true
			? payload.email.trim().toLowerCase()
			: null;
	return { subject: String(payload.sub), email };
}

function invalid(message: string, cause?: unknown): SynapseError {
	return new SynapseError(SECURITY_ERROR_CODES.SSO_ID_TOKEN_INVALID, message, { cause });
}
