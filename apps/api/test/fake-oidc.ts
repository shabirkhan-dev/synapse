import { exportJWK, generateKeyPair, SignJWT } from "jose";

import {
	OIDC_ERROR_CODES,
	type OidcClient,
	type OidcCodeExchange,
	type OidcSigningKey,
} from "@synapse/core/contracts";
import { SynapseError } from "@synapse/core/errors";

import type { SsoConnection, SsoLoginState, SsoStore } from "@/modules/sso";

export const FAKE_ISSUER = "https://idp.example.com";

type Grant = { claims: Record<string, unknown>; clientId: string; redirectUri: string };

/**
 * An identity provider in memory: `authorize` plays the user signing in at the provider and returns
 * the code it would redirect back with; `exchangeCode` checks it like a token endpoint (once, same
 * client and redirect) and returns an ID token signed with a real RS256 key.
 */
export class FakeOidcClient implements OidcClient {
	private readonly grants = new Map<string, Grant>();
	private keyPair: Awaited<ReturnType<typeof generateKeyPair>> | null = null;
	discoveries = 0;
	/** Set to make discovery fail like an unreachable provider. */
	down = false;

	async discover(issuer: string) {
		this.discoveries += 1;
		if (this.down || issuer !== FAKE_ISSUER) {
			throw new SynapseError(OIDC_ERROR_CODES.UNREACHABLE, "The provider could not be reached");
		}
		return {
			issuer: FAKE_ISSUER,
			authorizationEndpoint: `${FAKE_ISSUER}/authorize`,
			tokenEndpoint: `${FAKE_ISSUER}/token`,
			jwksUri: `${FAKE_ISSUER}/jwks`,
		};
	}

	/** The user signs in at the provider; `claims` override the ID token's (email, nonce...). */
	authorize(authorizationUrl: string, claims: Record<string, unknown>): string {
		const url = new URL(authorizationUrl);
		const code = crypto.randomUUID();
		this.grants.set(code, {
			claims: { nonce: url.searchParams.get("nonce"), email_verified: true, ...claims },
			clientId: url.searchParams.get("client_id") ?? "",
			redirectUri: url.searchParams.get("redirect_uri") ?? "",
		});
		return code;
	}

	async exchangeCode(input: OidcCodeExchange) {
		const grant = this.grants.get(input.code);
		this.grants.delete(input.code);
		if (!grant || grant.clientId !== input.clientId || grant.redirectUri !== input.redirectUri) {
			throw new SynapseError(OIDC_ERROR_CODES.CODE_REJECTED, "invalid_grant");
		}
		const { privateKey } = await this.keys();
		const idToken = await new SignJWT(grant.claims)
			.setProtectedHeader({ alg: "RS256", kid: "fake" })
			.setIssuer(FAKE_ISSUER)
			.setAudience(input.clientId)
			.setSubject(String(grant.claims.email ?? "someone"))
			.setIssuedAt()
			.setExpirationTime("5m")
			.sign(privateKey);
		return { idToken };
	}

	async signingKeys(): Promise<OidcSigningKey[]> {
		const { publicKey } = await this.keys();
		return [{ ...(await exportJWK(publicKey)), kid: "fake", alg: "RS256" } as OidcSigningKey];
	}

	private async keys() {
		this.keyPair ??= await generateKeyPair("RS256", { extractable: true });
		return this.keyPair;
	}
}

export class InMemorySsoStore implements SsoStore {
	connections: SsoConnection[] = [];
	states = new Map<string, SsoLoginState>();

	async find(organizationId: string) {
		return this.connections.find((item) => item.organizationId === organizationId) ?? null;
	}

	async findById(connectionId: string) {
		return this.connections.find((item) => item.id === connectionId) ?? null;
	}

	async findByVerifiedDomain(domain: string) {
		return (
			this.connections.find((item) =>
				item.domains.some((entry) => entry.domain === domain && entry.verifiedAt !== null),
			) ?? null
		);
	}

	async save(
		organizationId: string,
		input: Parameters<SsoStore["save"]>[1],
		verificationToken: string,
	) {
		const existing = await this.find(organizationId);
		const kept = new Map(existing?.domains.map((item) => [item.domain, item.verifiedAt]) ?? []);
		const connection: SsoConnection = {
			id: existing?.id ?? crypto.randomUUID(),
			organizationId,
			issuer: input.issuer,
			clientId: input.clientId,
			sealedClientSecret: input.sealedClientSecret ?? existing?.sealedClientSecret ?? "",
			defaultRole: input.defaultRole,
			verificationToken: existing?.verificationToken ?? verificationToken,
			domains: input.domains.map((domain) => ({ domain, verifiedAt: kept.get(domain) ?? null })),
			updatedAt: new Date().toISOString(),
		};
		this.connections = [...this.connections.filter((item) => item !== existing), connection];
		return connection;
	}

	async delete(organizationId: string) {
		const before = this.connections.length;
		this.connections = this.connections.filter((item) => item.organizationId !== organizationId);
		return this.connections.length < before;
	}

	async markVerified(connectionId: string, domain: string, at: Date) {
		if (
			this.connections.some(
				(item) =>
					item.id !== connectionId &&
					item.domains.some((entry) => entry.domain === domain && entry.verifiedAt !== null),
			)
		) {
			return false;
		}
		const entry = (await this.findById(connectionId))?.domains.find(
			(item) => item.domain === domain,
		);
		if (!entry) return false;
		entry.verifiedAt = at.toISOString();
		return true;
	}

	async saveState(stateHash: string, state: SsoLoginState) {
		this.states.set(stateHash, state);
	}

	async takeState(stateHash: string, now: Date) {
		const state = this.states.get(stateHash);
		this.states.delete(stateHash);
		return state && state.expiresAt > now ? state : null;
	}
}
