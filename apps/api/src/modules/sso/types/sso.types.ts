import type { OrganizationRole } from "@synapse/security";

export type SsoDomain = { domain: string; verifiedAt: string | null };

export type SsoConnection = {
	id: string;
	organizationId: string;
	issuer: string;
	clientId: string;
	/** Sealed with `AUTH_ENCRYPTION_KEY`; never leaves the API. */
	sealedClientSecret: string;
	defaultRole: OrganizationRole;
	verificationToken: string;
	domains: SsoDomain[];
	updatedAt: string;
};

export type SsoConnectionInput = {
	issuer: string;
	clientId: string;
	/** `null` keeps the stored secret. */
	sealedClientSecret: string | null;
	defaultRole: OrganizationRole;
	domains: string[];
	createdBy: string;
};

export type SsoLoginState = {
	connectionId: string;
	codeVerifier: string;
	nonce: string;
	expiresAt: Date;
};

export interface SsoStore {
	find(organizationId: string): Promise<SsoConnection | null>;
	findById(connectionId: string): Promise<SsoConnection | null>;
	/** The connection holding `domain` verified, if any. */
	findByVerifiedDomain(domain: string): Promise<SsoConnection | null>;
	/**
	 * Create or update the team's connection. Domains are replaced: kept ones keep their
	 * verification, new ones start unverified. `null` secret keeps the stored one; a new connection
	 * gets `verificationToken`.
	 */
	save(
		organizationId: string,
		input: SsoConnectionInput,
		verificationToken: string,
	): Promise<SsoConnection>;
	delete(organizationId: string): Promise<boolean>;
	/** `false` when another connection already holds the domain verified. */
	markVerified(connectionId: string, domain: string, at: Date): Promise<boolean>;
	/** Store a sign-in in flight (and drop expired ones). */
	saveState(stateHash: string, state: SsoLoginState): Promise<void>;
	/** Take a sign-in in flight once; `null` when unknown, used or expired. */
	takeState(stateHash: string, now: Date): Promise<SsoLoginState | null>;
}

/** What the team page shows; the secret only as "set". */
export type SsoConnectionView = {
	issuer: string;
	clientId: string;
	hasClientSecret: boolean;
	defaultRole: OrganizationRole;
	redirectUri: string;
	dnsRecord: { name: string; value: string };
	domains: SsoDomain[];
	updatedAt: string;
};
