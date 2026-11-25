import { describe, expect, test } from "bun:test";
import { OIDC_ERROR_CODES } from "@synapse/core/contracts";

import { createOidcClient } from "../src/oidc";

const issuer = "https://idp.example.com";
const discovery = {
	issuer,
	authorization_endpoint: `${issuer}/authorize`,
	token_endpoint: `${issuer}/token`,
	jwks_uri: `${issuer}/jwks`,
};

type Call = { url: string; host: string | null; init: RequestInit };

/** A provider at 93.184.216.34 answering by path; records each request. */
function fakeProvider(routes: Record<string, () => Response>) {
	const calls: Call[] = [];
	const fetch = (async (input: URL | string, init: RequestInit = {}) => {
		const url = new URL(String(input));
		calls.push({ url: url.href, host: new Headers(init.headers).get("host"), init });
		const route = routes[url.pathname];
		return route ? route() : new Response("{}", { status: 404 });
	}) as typeof globalThis.fetch;
	const client = createOidcClient({ fetch, resolve: async () => ["93.184.216.34"] });
	return { client, calls };
}

const json =
	(body: unknown, status = 200) =>
	() =>
		Response.json(body, { status });

describe("createOidcClient", () => {
	test("discovers the endpoints, pinned to the checked address, and caches them", async () => {
		const { client, calls } = fakeProvider({
			"/.well-known/openid-configuration": json(discovery),
		});
		const metadata = await client.discover(`${issuer}/`);
		expect(metadata).toEqual({
			issuer,
			authorizationEndpoint: `${issuer}/authorize`,
			tokenEndpoint: `${issuer}/token`,
			jwksUri: `${issuer}/jwks`,
		});
		await client.discover(issuer);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe("https://93.184.216.34/.well-known/openid-configuration");
		expect(calls[0]?.host).toBe("idp.example.com");
	});

	test("refuses a provider that names another issuer", async () => {
		const { client } = fakeProvider({
			"/.well-known/openid-configuration": json({ ...discovery, issuer: "https://evil.example" }),
		});
		await expect(client.discover(issuer)).rejects.toMatchObject({
			code: OIDC_ERROR_CODES.INVALID_RESPONSE,
		});
	});

	test("refuses http and private addresses", async () => {
		const { client } = fakeProvider({});
		await expect(client.discover("http://idp.example.com")).rejects.toMatchObject({
			code: OIDC_ERROR_CODES.NOT_ALLOWED,
		});
		const internal = createOidcClient({
			fetch: (async () => new Response("{}")) as unknown as typeof fetch,
			resolve: async () => ["169.254.169.254"],
		});
		await expect(internal.discover(issuer)).rejects.toMatchObject({
			code: OIDC_ERROR_CODES.NOT_ALLOWED,
		});
	});

	test("exchanges the code with the client secret and the PKCE verifier", async () => {
		const { client, calls } = fakeProvider({ "/token": json({ id_token: "a.b.c" }) });
		const result = await client.exchangeCode({
			provider: {
				issuer,
				authorizationEndpoint: `${issuer}/authorize`,
				tokenEndpoint: `${issuer}/token`,
				jwksUri: `${issuer}/jwks`,
			},
			clientId: "synapse",
			clientSecret: "s3cret",
			code: "the-code",
			redirectUri: "https://console.example.com/sso/callback",
			codeVerifier: "verifier",
		});
		expect(result).toEqual({ idToken: "a.b.c" });
		const sent = calls[0]?.init;
		expect(sent?.method).toBe("POST");
		expect(new Headers(sent?.headers).get("authorization")).toBe(
			`Basic ${Buffer.from("synapse:s3cret").toString("base64")}`,
		);
		const form = new URLSearchParams(String(sent?.body));
		expect(form.get("grant_type")).toBe("authorization_code");
		expect(form.get("code_verifier")).toBe("verifier");
	});

	test("a refused code and a missing ID token are told apart", async () => {
		const provider = {
			issuer,
			authorizationEndpoint: "",
			tokenEndpoint: `${issuer}/token`,
			jwksUri: "",
		};
		const input = {
			provider,
			clientId: "c",
			clientSecret: "s",
			code: "x",
			redirectUri: "https://c.example/cb",
			codeVerifier: "v",
		};
		const refused = fakeProvider({ "/token": json({ error: "invalid_grant" }, 400) });
		await expect(refused.client.exchangeCode(input)).rejects.toMatchObject({
			code: OIDC_ERROR_CODES.CODE_REJECTED,
		});
		const empty = fakeProvider({ "/token": json({ access_token: "x" }) });
		await expect(empty.client.exchangeCode(input)).rejects.toMatchObject({
			code: OIDC_ERROR_CODES.INVALID_RESPONSE,
		});
	});

	test("reads the key set", async () => {
		const { client } = fakeProvider({ "/jwks": json({ keys: [{ kty: "RSA", kid: "1" }] }) });
		expect(await client.signingKeys(`${issuer}/jwks`)).toEqual([{ kty: "RSA", kid: "1" }]);
	});
});
