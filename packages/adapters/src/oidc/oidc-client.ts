import {
	OIDC_ERROR_CODES,
	type OidcClient,
	type OidcCodeExchange,
	type OidcProviderMetadata,
	type OidcSigningKey,
} from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

import { createPublicRequest, type ResolveHost } from "../web/public-request";

export type OidcClientOptions = {
	/** Each request (discovery, token, keys). */
	timeoutMs?: number;
	/** How long discovery documents and key sets are reused. */
	cacheTtlMs?: number;
	/** Development and tests only: http and private addresses (production config refuses it). */
	allowPrivateNetworks?: boolean;
	resolve?: ResolveHost;
	fetch?: typeof fetch;
	now?: () => number;
};

const MAX_BYTES = 256 * 1024;
const USER_AGENT = "Synapse/1.0 (+single sign-on)";

const fail = (code: string, message: string, retryable = false) =>
	new SynapseError(code, message, { retryable });

const invalid = (message: string) => fail(OIDC_ERROR_CODES.INVALID_RESPONSE, message);

function stringField(document: Record<string, unknown>, name: string): string {
	const value = document[name];
	if (typeof value !== "string" || value.length === 0) {
		throw invalid(`The provider's discovery document has no ${name}`);
	}
	return value;
}

/**
 * OpenID Connect over HTTP for single sign-on: discovery (the issuer must match exactly, OIDC
 * Discovery 4.3), the authorization code exchange (client secret + PKCE verifier) and the JWK Set.
 * Every request goes through the SSRF-safe public request (https only, public addresses, no
 * redirects), with a deadline and a size cap. Discovery and keys are cached per URL.
 */
export function createOidcClient({
	timeoutMs = 10_000,
	cacheTtlMs = 10 * 60_000,
	allowPrivateNetworks = false,
	resolve,
	fetch: fetchImpl = fetch,
	now = Date.now,
}: OidcClientOptions = {}): OidcClient {
	const request = createPublicRequest({
		allowPrivateNetworks,
		resolve,
		fetch: fetchImpl,
		httpsOnly: true,
		codes: { notAllowed: OIDC_ERROR_CODES.NOT_ALLOWED, unreachable: OIDC_ERROR_CODES.UNREACHABLE },
	});
	const cache = new Map<string, { value: unknown; expiresAt: number }>();

	async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
		const hit = cache.get(key);
		if (hit && hit.expiresAt > now()) return hit.value as T;
		const value = await load();
		cache.set(key, { value, expiresAt: now() + cacheTtlMs });
		return value;
	}

	async function json(
		url: string,
		init: RequestInit,
	): Promise<{ status: number; body: Record<string, unknown> }> {
		let target: URL;
		try {
			target = new URL(url);
		} catch {
			throw fail(OIDC_ERROR_CODES.NOT_ALLOWED, "That is not a web address");
		}
		const deadline = AbortSignal.timeout(timeoutMs);
		try {
			const response = await request(target, {
				...init,
				signal: deadline,
				headers: { ...init.headers, Accept: "application/json", "User-Agent": USER_AGENT },
			});
			const text = await readCapped(response);
			let body: unknown;
			try {
				body = JSON.parse(text);
			} catch {
				throw invalid(`The provider answered ${response.status} without JSON`);
			}
			if (typeof body !== "object" || body === null || Array.isArray(body)) {
				throw invalid("The provider's answer is not a JSON object");
			}
			return { status: response.status, body: body as Record<string, unknown> };
		} catch (error) {
			if (error instanceof SynapseError) throw error;
			if (deadline.aborted) {
				throw fail(
					OIDC_ERROR_CODES.UNREACHABLE,
					`The provider took longer than ${timeoutMs / 1000} s`,
					true,
				);
			}
			throw fail(OIDC_ERROR_CODES.UNREACHABLE, "The provider could not be reached", true);
		}
	}

	async function discover(issuer: string): Promise<OidcProviderMetadata> {
		const base = issuer.replace(/\/+$/, "");
		return cached(`discovery:${base}`, async () => {
			const { status, body } = await json(`${base}/.well-known/openid-configuration`, {});
			if (status !== 200) {
				throw fail(
					OIDC_ERROR_CODES.UNREACHABLE,
					`The provider's discovery document answered ${status}`,
				);
			}
			const metadata: OidcProviderMetadata = {
				issuer: stringField(body, "issuer"),
				authorizationEndpoint: stringField(body, "authorization_endpoint"),
				tokenEndpoint: stringField(body, "token_endpoint"),
				jwksUri: stringField(body, "jwks_uri"),
			};
			if (metadata.issuer.replace(/\/+$/, "") !== base) {
				throw invalid(`The provider calls itself ${metadata.issuer}, not ${issuer}`);
			}
			return metadata;
		});
	}

	async function exchangeCode(input: OidcCodeExchange): Promise<{ idToken: string }> {
		const form = new URLSearchParams({
			grant_type: "authorization_code",
			code: input.code,
			redirect_uri: input.redirectUri,
			code_verifier: input.codeVerifier,
		});
		const credentials = Buffer.from(
			`${encodeURIComponent(input.clientId)}:${encodeURIComponent(input.clientSecret)}`,
		).toString("base64");
		const { status, body } = await json(input.provider.tokenEndpoint, {
			method: "POST",
			headers: {
				Authorization: `Basic ${credentials}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: form.toString(),
		});
		if (status >= 400 && status < 500) {
			throw fail(OIDC_ERROR_CODES.CODE_REJECTED, "The provider refused the sign-in code");
		}
		if (status !== 200) {
			throw fail(OIDC_ERROR_CODES.UNREACHABLE, `The provider's token endpoint answered ${status}`);
		}
		if (typeof body.id_token !== "string") throw invalid("The provider returned no ID token");
		return { idToken: body.id_token };
	}

	async function signingKeys(jwksUri: string): Promise<OidcSigningKey[]> {
		return cached(`keys:${jwksUri}`, async () => {
			const { status, body } = await json(jwksUri, {});
			if (status !== 200 || !Array.isArray(body.keys)) {
				throw invalid("The provider's key set could not be read");
			}
			return body.keys as OidcSigningKey[];
		});
	}

	return { discover, exchangeCode, signingKeys };
}

async function readCapped(response: Response): Promise<string> {
	if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) {
		await response.body?.cancel();
		throw invalid("The provider's answer is too large");
	}
	if (!response.body) return "";
	const reader = response.body.getReader();
	const parts: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		// oxlint-disable-next-line no-await-in-loop -- streaming read with a size cap
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_BYTES) {
			await reader.cancel();
			throw invalid("The provider's answer is too large");
		}
		parts.push(value);
	}
	return new TextDecoder().decode(Buffer.concat(parts));
}
