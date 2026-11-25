import { and, asc, eq, gt, isNotNull, lt } from "drizzle-orm";

import {
	type Database,
	type SsoConnectionRow,
	ssoConnections,
	ssoDomains,
	ssoLoginStates,
} from "@synapse/database";
import { isOrganizationRole } from "@synapse/security";

import type {
	SsoConnection,
	SsoConnectionInput,
	SsoLoginState,
	SsoStore,
} from "../types/sso.types";

const UNIQUE_VIOLATION = "23505";

/** postgres.js reports the SQLSTATE on the error; Drizzle may wrap it as the cause. */
function isUniqueViolation(error: unknown): boolean {
	for (let current = error; current; current = (current as { cause?: unknown }).cause) {
		if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
	}
	return false;
}

export class DrizzleSsoRepository implements SsoStore {
	constructor(private readonly db: Database) {}

	async find(organizationId: string): Promise<SsoConnection | null> {
		const [row] = await this.db
			.select()
			.from(ssoConnections)
			.where(eq(ssoConnections.organizationId, organizationId))
			.limit(1);
		return row ? this.withDomains(row) : null;
	}

	async findById(connectionId: string): Promise<SsoConnection | null> {
		const [row] = await this.db
			.select()
			.from(ssoConnections)
			.where(eq(ssoConnections.id, connectionId))
			.limit(1);
		return row ? this.withDomains(row) : null;
	}

	async findByVerifiedDomain(domain: string): Promise<SsoConnection | null> {
		const [row] = await this.db
			.select({ connection: ssoConnections })
			.from(ssoDomains)
			.innerJoin(ssoConnections, eq(ssoConnections.id, ssoDomains.connectionId))
			.where(and(eq(ssoDomains.domain, domain), isNotNull(ssoDomains.verifiedAt)))
			.limit(1);
		return row ? this.withDomains(row.connection) : null;
	}

	async save(
		organizationId: string,
		input: SsoConnectionInput,
		verificationToken: string,
	): Promise<SsoConnection> {
		const id = await this.db.transaction(async (tx) => {
			const now = new Date();
			const [row] = await tx
				.insert(ssoConnections)
				.values({
					organizationId,
					issuer: input.issuer,
					clientId: input.clientId,
					clientSecret: input.sealedClientSecret ?? "",
					defaultRole: input.defaultRole,
					verificationToken,
					createdBy: input.createdBy,
				})
				.onConflictDoUpdate({
					target: ssoConnections.organizationId,
					set: {
						issuer: input.issuer,
						clientId: input.clientId,
						defaultRole: input.defaultRole,
						updatedAt: now,
						...(input.sealedClientSecret ? { clientSecret: input.sealedClientSecret } : {}),
					},
				})
				.returning({ id: ssoConnections.id });
			const connectionId = (row as { id: string }).id;
			const kept = await tx
				.select({ domain: ssoDomains.domain })
				.from(ssoDomains)
				.where(eq(ssoDomains.connectionId, connectionId));
			const wanted = new Set(input.domains);
			for (const { domain } of kept) {
				if (wanted.has(domain)) continue;
				// oxlint-disable-next-line no-await-in-loop -- at most a few domains
				await tx
					.delete(ssoDomains)
					.where(and(eq(ssoDomains.connectionId, connectionId), eq(ssoDomains.domain, domain)));
			}
			if (input.domains.length > 0) {
				await tx
					.insert(ssoDomains)
					.values(input.domains.map((domain) => ({ connectionId, domain })))
					.onConflictDoNothing();
			}
			return connectionId;
		});
		return (await this.findById(id)) as SsoConnection;
	}

	async delete(organizationId: string): Promise<boolean> {
		const deleted = await this.db
			.delete(ssoConnections)
			.where(eq(ssoConnections.organizationId, organizationId))
			.returning({ id: ssoConnections.id });
		return deleted.length > 0;
	}

	async markVerified(connectionId: string, domain: string, at: Date): Promise<boolean> {
		try {
			const updated = await this.db
				.update(ssoDomains)
				.set({ verifiedAt: at })
				.where(and(eq(ssoDomains.connectionId, connectionId), eq(ssoDomains.domain, domain)))
				.returning({ domain: ssoDomains.domain });
			return updated.length > 0;
		} catch (error) {
			// Another team holds this domain verified (partial unique index).
			if (isUniqueViolation(error)) return false;
			throw error;
		}
	}

	async saveState(stateHash: string, state: SsoLoginState): Promise<void> {
		await this.db.delete(ssoLoginStates).where(lt(ssoLoginStates.expiresAt, new Date()));
		await this.db.insert(ssoLoginStates).values({ stateHash, ...state });
	}

	async takeState(stateHash: string, now: Date): Promise<SsoLoginState | null> {
		const [row] = await this.db
			.delete(ssoLoginStates)
			.where(and(eq(ssoLoginStates.stateHash, stateHash), gt(ssoLoginStates.expiresAt, now)))
			.returning();
		return row
			? {
					connectionId: row.connectionId,
					codeVerifier: row.codeVerifier,
					nonce: row.nonce,
					expiresAt: row.expiresAt,
				}
			: null;
	}

	private async withDomains(row: SsoConnectionRow): Promise<SsoConnection> {
		const domains = await this.db
			.select({ domain: ssoDomains.domain, verifiedAt: ssoDomains.verifiedAt })
			.from(ssoDomains)
			.where(eq(ssoDomains.connectionId, row.id))
			.orderBy(asc(ssoDomains.domain));
		return {
			id: row.id,
			organizationId: row.organizationId,
			issuer: row.issuer,
			clientId: row.clientId,
			sealedClientSecret: row.clientSecret,
			defaultRole: isOrganizationRole(row.defaultRole) ? row.defaultRole : "member",
			verificationToken: row.verificationToken,
			domains: domains.map((item) => ({
				domain: item.domain,
				verifiedAt: item.verifiedAt?.toISOString() ?? null,
			})),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
