/** Codes an OIDC client throws (as `SynapseError`) when a provider cannot be used. */
export const OIDC_ERROR_CODES = {
	/** Not https, a private or internal address, or credentials in the URL. */
	NOT_ALLOWED: "OIDC_PROVIDER_NOT_ALLOWED",
	/** DNS failure, refused connection, timeout or a non-2xx answer. */
	UNREACHABLE: "OIDC_PROVIDER_UNREACHABLE",
	/** The discovery document or the token response is not what OpenID Connect requires. */
	INVALID_RESPONSE: "OIDC_PROVIDER_INVALID_RESPONSE",
	/** The token endpoint refused the authorization code (expired, reused, wrong client). */
	CODE_REJECTED: "OIDC_CODE_REJECTED",
} as const;

/** One public key from the provider's JWK Set (RFC 7517), passed through as the provider sent it. */
export type OidcSigningKey = { kty: string } & Record<string, unknown>;

/** The parts of a provider's discovery document that the authorization code flow needs. */
export type OidcProviderMetadata = {
	issuer: string;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	jwksUri: string;
};

export type OidcCodeExchange = {
	provider: OidcProviderMetadata;
	clientId: string;
	clientSecret: string;
	code: string;
	redirectUri: string;
	/** The PKCE verifier whose challenge went out with the authorization request. */
	codeVerifier: string;
};

/**
 * Talks to an OpenID Connect provider over HTTP: discovery, the code exchange and its signing keys.
 * Implemented in `@synapse/adapters/oidc`, which refuses private and internal addresses (SSRF).
 * Verifying the ID token is not its job (`@synapse/security`).
 */
export interface OidcClient {
	discover(issuer: string): Promise<OidcProviderMetadata>;
	/** The raw ID token (a JWS) from the token endpoint. */
	exchangeCode(input: OidcCodeExchange): Promise<{ idToken: string }>;
	/** The provider's public keys (JWK Set `keys`). */
	signingKeys(jwksUri: string): Promise<OidcSigningKey[]>;
}
