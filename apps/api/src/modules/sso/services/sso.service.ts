import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import { OIDC_ERROR_CODES, type OidcClient } from "@synapse/core/contracts";
import { isSynapseError } from "@synapse/core/errors";
import {
	authorizationUrl,
	can,
	createOidcNonce,
	createPkce,
	createSecretToken,
	hashSecretToken,
	type OrganizationRole,
	openSecret,
	SECURITY_ERROR_CODES,
	sealSecret,
	verifyIdToken,
} from "@synapse/security";

import type { ClientInfo, RateLimiter, SignedIn, User } from "@/modules/auth";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser, RequestContext } from "@/shared/types/app-types";

import {
	SSO_DNS_RECORD_PREFIX,
	SSO_ERROR_CODES,
	SSO_LIMITS,
	SSO_MESSAGES,
} from "../constants/sso.constants";
import type { SsoConnection, SsoConnectionView, SsoStore } from "../types/sso.types";

export type SsoServiceDependencies = {
	store: SsoStore;
	oidc: OidcClient;
	/** Accounts and sessions are the auth module's; SSO only vouches for the email. */
	accounts: {
		ssoAccount(email: string): Promise<User>;
		startSsoSession(
			user: User,
			organizationId: string,
			client: ClientInfo,
			context: RequestContext,
		): Promise<SignedIn>;
	};
	organizations: {
		kind(organizationId: string): Promise<"personal" | "team" | null>;
		/** Adds the user with `role` unless already a member (never demotes). */
		addMemberIfAbsent(
			organizationId: string,
			userId: string,
			role: OrganizationRole,
		): Promise<void>;
	};
	/** DNS TXT lookup (`node:dns/promises` `resolveTxt`). */
	resolveTxt: (name: string) => Promise<string[][]>;
	rateLimiter: RateLimiter;
	audit: AuditLog;
	/** Seals the client secret at rest (`AUTH_ENCRYPTION_KEY`). */
	encryptionKey: Uint8Array;
	/** The console page providers send people back to (registered with the provider). */
	redirectUri: string;
	now?: () => Date;
};

export type SaveConnectionInput = {
	issuer: string;
	clientId: string;
	/** Omitted or empty keeps the stored secret. */
	clientSecret?: string | undefined;
	defaultRole: OrganizationRole;
	domains: string[];
};

/**
 * Single sign-on with OpenID Connect (syn-094, ADR-0009). A team's owner registers its provider and
 * the email domains it signs in; a domain is used only once a DNS TXT record proves the team
 * controls it. Sign-in is the authorization code flow with PKCE and a nonce; the ID token is checked
 * against the provider's keys and must carry a verified email in one of the team's domains.
 */
export class SsoService {
	constructor(private readonly deps: SsoServiceDependencies) {}

	/** Admins and owners see the settings; only owners change them. */
	async view(user: AuthUser): Promise<SsoConnectionView | null> {
		await this.requireTeam(user);
		if (!can(user.role, "members.manage")) throw forbidden();
		const connection = await this.deps.store.find(user.orgId);
		return connection ? this.toView(connection) : null;
	}

	async save(
		user: AuthUser,
		input: SaveConnectionInput,
		context: RequestContext,
	): Promise<SsoConnectionView> {
		await this.requireOwner(user);
		const existing = await this.deps.store.find(user.orgId);
		const secret = input.clientSecret?.trim() || null;
		if (!existing && !secret) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				code: SSO_ERROR_CODES.SECRET_REQUIRED,
				message: SSO_MESSAGES.SECRET_REQUIRED,
			});
		}
		const issuer = input.issuer.trim().replace(/\/+$/, "");
		// Saving checks the provider answers as this issuer, so a typo fails here, not at sign-in.
		await this.provider(issuer, HTTP_STATUS.UNPROCESSABLE_ENTITY);
		const domains = [...new Set(input.domains.map(normalizeDomain))];
		const saved = await this.deps.store.save(
			user.orgId,
			{
				issuer,
				clientId: input.clientId.trim(),
				sealedClientSecret: secret ? sealSecret(secret, this.deps.encryptionKey) : null,
				defaultRole: input.defaultRole,
				domains,
				createdBy: user.sub,
			},
			createSecretToken(),
		);
		await this.record(AUDIT_ACTIONS.SSO_CONNECTION_SAVED, user, context, { issuer, domains });
		return this.toView(saved);
	}

	async remove(user: AuthUser, context: RequestContext): Promise<void> {
		await this.requireOwner(user);
		if (!(await this.deps.store.delete(user.orgId))) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: SSO_ERROR_CODES.CONNECTION_NOT_FOUND,
				message: SSO_MESSAGES.CONNECTION_NOT_FOUND,
			});
		}
		await this.record(AUDIT_ACTIONS.SSO_CONNECTION_DELETED, user, context, {});
	}

	/** Look up each unverified domain's TXT record; a domain another team holds stays unverified. */
	async verifyDomains(user: AuthUser, context: RequestContext): Promise<SsoConnectionView> {
		await this.requireOwner(user);
		const connection = await this.deps.store.find(user.orgId);
		if (!connection) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: SSO_ERROR_CODES.CONNECTION_NOT_FOUND,
				message: SSO_MESSAGES.CONNECTION_NOT_FOUND,
			});
		}
		const expected = this.recordValue(connection);
		const pending = connection.domains.filter((domain) => domain.verifiedAt === null);
		const found = await Promise.all(
			pending.map(async ({ domain }) => {
				const records = await this.deps
					.resolveTxt(`${SSO_DNS_RECORD_PREFIX}.${domain}`)
					.catch(() => [] as string[][]);
				return records.some((chunks) => chunks.join("") === expected) ? domain : null;
			}),
		);
		for (const domain of found) {
			if (domain === null) continue;
			// oxlint-disable-next-line no-await-in-loop -- few domains; each verification audited
			if (await this.deps.store.markVerified(connection.id, domain, this.now())) {
				// oxlint-disable-next-line no-await-in-loop
				await this.record(AUDIT_ACTIONS.SSO_DOMAIN_VERIFIED, user, context, { domain });
			}
		}
		return this.toView((await this.deps.store.find(user.orgId)) ?? connection);
	}

	/**
	 * Where to send the browser for `email`, if its domain has single sign-on. `browserBinding` goes
	 * into an httpOnly cookie: the callback must come from the same browser (no login CSRF).
	 */
	async start(
		email: string,
		ip: string,
	): Promise<{ authorizationUrl: string; browserBinding: string }> {
		const { allowed, retryAfterSeconds } = await this.deps.rateLimiter.hit(
			hashSecretToken(`sso-start:ip:${ip}`),
			SSO_LIMITS.START_PER_IP,
		);
		if (!allowed) {
			throw new AppError({
				statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
				code: SSO_ERROR_CODES.RATE_LIMITED,
				message: SSO_MESSAGES.RATE_LIMITED,
				details: [{ retryAfterSeconds }],
			});
		}
		const normalized = email.trim().toLowerCase();
		const connection = await this.deps.store.findByVerifiedDomain(domainOf(normalized));
		if (!connection) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: SSO_ERROR_CODES.NOT_CONFIGURED,
				message: SSO_MESSAGES.NOT_CONFIGURED,
			});
		}
		const provider = await this.provider(connection.issuer, HTTP_STATUS.BAD_GATEWAY);
		const pkce = createPkce();
		const state = createOidcNonce();
		const nonce = createOidcNonce();
		const browserBinding = createSecretToken();
		await this.deps.store.saveState(stateKey(state, browserBinding), {
			connectionId: connection.id,
			codeVerifier: pkce.verifier,
			nonce,
			expiresAt: new Date(this.now().getTime() + SSO_LIMITS.STATE_TTL_SECONDS * 1000),
		});
		return {
			browserBinding,
			authorizationUrl: authorizationUrl({
				authorizationEndpoint: provider.authorizationEndpoint,
				clientId: connection.clientId,
				redirectUri: this.deps.redirectUri,
				state,
				nonce,
				codeChallenge: pkce.challenge,
				loginHint: normalized,
			}),
		};
	}

	/** Finish at the redirect: check the answer, then sign in (creating the account on first use). */
	async complete(
		{ code, state, browserBinding }: { code: string; state: string; browserBinding: string | null },
		client: ClientInfo,
		context: RequestContext,
	): Promise<SignedIn> {
		const pending = browserBinding
			? await this.deps.store.takeState(stateKey(state, browserBinding), this.now())
			: null;
		const connection = pending ? await this.deps.store.findById(pending.connectionId) : null;
		if (!pending || !connection) {
			throw new AppError({
				statusCode: HTTP_STATUS.BAD_REQUEST,
				code: SSO_ERROR_CODES.STATE_INVALID,
				message: SSO_MESSAGES.STATE_INVALID,
			});
		}
		const provider = await this.provider(connection.issuer, HTTP_STATUS.BAD_GATEWAY);
		let email: string | null;
		try {
			const { idToken } = await this.deps.oidc.exchangeCode({
				provider,
				clientId: connection.clientId,
				clientSecret: openSecret(connection.sealedClientSecret, this.deps.encryptionKey),
				code,
				redirectUri: this.deps.redirectUri,
				codeVerifier: pending.codeVerifier,
			});
			const keys = await this.deps.oidc.signingKeys(provider.jwksUri);
			({ email } = await verifyIdToken(idToken, {
				keys,
				issuer: provider.issuer,
				clientId: connection.clientId,
				nonce: pending.nonce,
				now: this.now(),
			}));
		} catch (error) {
			throw signInFailed(error);
		}
		const verified = new Set(
			connection.domains.filter((item) => item.verifiedAt !== null).map((item) => item.domain),
		);
		if (!email || !verified.has(domainOf(email))) {
			throw new AppError({
				statusCode: HTTP_STATUS.FORBIDDEN,
				code: SSO_ERROR_CODES.EMAIL_NOT_ALLOWED,
				message: SSO_MESSAGES.EMAIL_NOT_ALLOWED,
			});
		}
		const account = await this.deps.accounts.ssoAccount(email);
		await this.deps.organizations.addMemberIfAbsent(
			connection.organizationId,
			account.id,
			connection.defaultRole,
		);
		return this.deps.accounts.startSsoSession(account, connection.organizationId, client, context);
	}

	private async provider(
		issuer: string,
		statusCode: typeof HTTP_STATUS.UNPROCESSABLE_ENTITY | typeof HTTP_STATUS.BAD_GATEWAY,
	) {
		try {
			return await this.deps.oidc.discover(issuer);
		} catch (error) {
			throw new AppError({
				statusCode,
				code: SSO_ERROR_CODES.PROVIDER_FAILED,
				message: isSynapseError(error)
					? `${SSO_MESSAGES.PROVIDER_FAILED}: ${error.message}`
					: SSO_MESSAGES.PROVIDER_FAILED,
				cause: error,
			});
		}
	}

	private async requireTeam(user: AuthUser): Promise<void> {
		if ((await this.deps.organizations.kind(user.orgId)) !== "team") {
			throw new AppError({
				statusCode: HTTP_STATUS.CONFLICT,
				code: SSO_ERROR_CODES.NOT_A_TEAM,
				message: SSO_MESSAGES.NOT_A_TEAM,
			});
		}
	}

	private async requireOwner(user: AuthUser): Promise<void> {
		await this.requireTeam(user);
		if (!can(user.role, "sso.manage")) throw forbidden();
	}

	private recordValue(connection: SsoConnection): string {
		return `synapse-verification=${connection.verificationToken}`;
	}

	private toView(connection: SsoConnection): SsoConnectionView {
		return {
			issuer: connection.issuer,
			clientId: connection.clientId,
			hasClientSecret: connection.sealedClientSecret.length > 0,
			defaultRole: connection.defaultRole,
			redirectUri: this.deps.redirectUri,
			dnsRecord: { name: SSO_DNS_RECORD_PREFIX, value: this.recordValue(connection) },
			domains: connection.domains,
			updatedAt: connection.updatedAt,
		};
	}

	private now(): Date {
		return this.deps.now?.() ?? new Date();
	}

	private async record(
		action: string,
		user: AuthUser,
		context: RequestContext,
		data: Record<string, unknown>,
	): Promise<void> {
		await this.deps.audit.record({
			ownerId: user.orgId,
			actorId: user.sub,
			action,
			subjectType: "organization",
			subjectId: user.orgId,
			requestId: context.requestId,
			data,
			provenance: null,
		});
	}
}

/** A state is found only with the cookie of the browser that started the sign-in. */
function stateKey(state: string, browserBinding: string): string {
	return hashSecretToken(`${state}.${browserBinding}`);
}

function domainOf(email: string): string {
	return email.slice(email.lastIndexOf("@") + 1);
}

function normalizeDomain(domain: string): string {
	return domain.trim().toLowerCase().replace(/\.$/, "");
}

function forbidden(): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.FORBIDDEN,
		code: SSO_ERROR_CODES.FORBIDDEN,
		message: SSO_MESSAGES.FORBIDDEN,
	});
}

/** A refused code or a token that does not verify is the user's to retry; a broken provider is not. */
function signInFailed(error: unknown): unknown {
	if (!isSynapseError(error)) return error;
	const rejected =
		error.code === OIDC_ERROR_CODES.CODE_REJECTED ||
		error.code === SECURITY_ERROR_CODES.SSO_ID_TOKEN_INVALID;
	return new AppError({
		statusCode: rejected ? HTTP_STATUS.UNAUTHORIZED : HTTP_STATUS.BAD_GATEWAY,
		code: rejected ? SSO_ERROR_CODES.SIGN_IN_REJECTED : SSO_ERROR_CODES.PROVIDER_FAILED,
		message: rejected
			? SSO_MESSAGES.SIGN_IN_REJECTED
			: `${SSO_MESSAGES.PROVIDER_FAILED}: ${error.message}`,
		cause: error,
	});
}
