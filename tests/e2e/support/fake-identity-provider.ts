import { createHash, createSign, generateKeyPairSync } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * A minimal OpenID Connect provider for the single sign-on tests, under `/oidc` on the fake model
 * server. `authorize` signs in as the `login_hint` at once (no login form) and redirects back with
 * a code; `token` checks the client, the redirect and PKCE like a real provider before returning an
 * RS256 ID token.
 */
export const FAKE_OIDC = { clientId: "e2e-client", clientSecret: "e2e-client-secret" } as const;

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "e2e", alg: "RS256", use: "sig" };

type Grant = {
	email: string;
	nonce: string;
	clientId: string;
	redirectUri: string;
	challenge: string;
};
const grants = new Map<string, Grant>();

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

function idToken(issuer: string, grant: Grant): string {
	const now = Math.floor(Date.now() / 1000);
	const header = base64url(JSON.stringify({ alg: "RS256", kid: "e2e", typ: "JWT" }));
	const payload = base64url(
		JSON.stringify({
			iss: issuer,
			aud: grant.clientId,
			sub: `e2e|${grant.email}`,
			email: grant.email,
			email_verified: true,
			nonce: grant.nonce,
			iat: now,
			exp: now + 300,
		}),
	);
	const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey);
	return `${header}.${payload}.${base64url(signature)}`;
}

function json(response: ServerResponse, body: unknown, status = 200) {
	response.statusCode = status;
	response.setHeader("content-type", "application/json");
	response.end(JSON.stringify(body));
}

/** Handles `/oidc/*`; returns `false` for anything else. */
export function handleIdentityProvider(
	request: IncomingMessage,
	raw: string,
	response: ServerResponse,
	origin: string,
): boolean {
	const url = new URL(request.url ?? "/", origin);
	if (!url.pathname.startsWith("/oidc/")) return false;
	const issuer = `${origin}/oidc`;

	if (url.pathname === "/oidc/.well-known/openid-configuration") {
		json(response, {
			issuer,
			authorization_endpoint: `${issuer}/authorize`,
			token_endpoint: `${issuer}/token`,
			jwks_uri: `${issuer}/jwks`,
			response_types_supported: ["code"],
			id_token_signing_alg_values_supported: ["RS256"],
		});
		return true;
	}
	if (url.pathname === "/oidc/jwks") {
		json(response, { keys: [jwk] });
		return true;
	}
	if (url.pathname === "/oidc/authorize") {
		const code = crypto.randomUUID();
		const redirectUri = url.searchParams.get("redirect_uri") ?? "";
		grants.set(code, {
			email: url.searchParams.get("login_hint") ?? "",
			nonce: url.searchParams.get("nonce") ?? "",
			clientId: url.searchParams.get("client_id") ?? "",
			redirectUri,
			challenge: url.searchParams.get("code_challenge") ?? "",
		});
		const back = new URL(redirectUri);
		back.searchParams.set("code", code);
		back.searchParams.set("state", url.searchParams.get("state") ?? "");
		response.statusCode = 302;
		response.setHeader("location", back.href);
		response.end();
		return true;
	}
	if (url.pathname === "/oidc/token" && request.method === "POST") {
		const form = new URLSearchParams(raw);
		const [clientId, clientSecret] = Buffer.from(
			(request.headers.authorization ?? "").replace(/^Basic /, ""),
			"base64",
		)
			.toString()
			.split(":")
			.map(decodeURIComponent);
		const grant = grants.get(form.get("code") ?? "");
		grants.delete(form.get("code") ?? "");
		const verifier = form.get("code_verifier") ?? "";
		const pkce = createHash("sha256").update(verifier).digest("base64url");
		if (
			!grant ||
			clientId !== FAKE_OIDC.clientId ||
			clientSecret !== FAKE_OIDC.clientSecret ||
			grant.clientId !== clientId ||
			grant.redirectUri !== form.get("redirect_uri") ||
			grant.challenge !== pkce
		) {
			json(response, { error: "invalid_grant" }, 400);
			return true;
		}
		json(response, { token_type: "Bearer", access_token: "e2e", id_token: idToken(issuer, grant) });
		return true;
	}
	json(response, { error: "not_found" }, 404);
	return true;
}
