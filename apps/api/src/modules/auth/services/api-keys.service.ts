import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import { createSecretToken, hashSecretToken, type OrganizationRole } from "@synapse/security";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser, RequestContext } from "@/shared/types/app-types";

import {
	API_KEY_PREFIX,
	API_KEY_TOUCH_INTERVAL_MS,
	API_KEY_VISIBLE_CHARS,
	AUTH_ERROR_CODES,
	AUTH_MESSAGES,
	MAX_API_KEYS,
} from "../constants/auth.constants";
import type { ApiKey, ApiKeyStore } from "../types/api-key.types";

export type ApiKeysServiceDependencies = {
	store: ApiKeyStore;
	/** The user's current role in an organization (`null` once they left it). */
	roleOf: (organizationId: string, userId: string) => Promise<OrganizationRole | null>;
	audit: AuditLog;
	now?: () => Date;
};

/**
 * Personal API keys (syn-083): `syn_…` bearer tokens that act as their user in the organization
 * they were made in, with the user's role there read on every request. Shown once, stored hashed.
 */
export class ApiKeysService {
	constructor(private readonly deps: ApiKeysServiceDependencies) {}

	/** A new key for the caller's active organization; the returned `key` is never shown again. */
	async create(
		user: AuthUser,
		{ name, expiresInDays }: { name: string; expiresInDays?: number | undefined },
		context: RequestContext,
	): Promise<{ apiKey: ApiKey; key: string }> {
		if ((await this.deps.store.count(user.sub)) >= MAX_API_KEYS) {
			throw new AppError({
				statusCode: HTTP_STATUS.CONFLICT,
				code: AUTH_ERROR_CODES.TOO_MANY_API_KEYS,
				message: AUTH_MESSAGES.TOO_MANY_API_KEYS,
			});
		}
		const key = `${API_KEY_PREFIX}${createSecretToken()}`;
		const now = this.now();
		const apiKey = await this.deps.store.create({
			userId: user.sub,
			organizationId: user.orgId,
			name,
			prefix: key.slice(0, API_KEY_VISIBLE_CHARS),
			keyHash: hashSecretToken(key),
			expiresAt: expiresInDays ? new Date(now.getTime() + expiresInDays * 86_400_000) : null,
		});
		await this.record(user, AUDIT_ACTIONS.AUTH_API_KEY_CREATED, apiKey, context);
		return { apiKey, key };
	}

	list(user: AuthUser): Promise<ApiKey[]> {
		return this.deps.store.list(user.sub);
	}

	async revoke(user: AuthUser, id: string, context: RequestContext): Promise<void> {
		const keys = await this.deps.store.list(user.sub);
		const apiKey = keys.find((key) => key.id === id);
		if (!apiKey || !(await this.deps.store.remove(user.sub, id))) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: AUTH_ERROR_CODES.API_KEY_NOT_FOUND,
				message: AUTH_MESSAGES.API_KEY_NOT_FOUND,
			});
		}
		await this.record(user, AUDIT_ACTIONS.AUTH_API_KEY_REVOKED, apiKey, context);
	}

	/** The caller a key acts for; 401 when it is unknown, expired, or its user left its organization. */
	async authenticate(key: string): Promise<AuthUser> {
		const found = await this.deps.store.findByHash(hashSecretToken(key));
		const now = this.now();
		if (!found || (found.expiresAt && new Date(found.expiresAt) <= now)) {
			throw invalidKey();
		}
		const role = await this.deps.roleOf(found.organizationId, found.userId);
		if (!role) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNAUTHORIZED,
				code: AUTH_ERROR_CODES.NOT_A_MEMBER,
				message: AUTH_MESSAGES.NOT_A_MEMBER,
			});
		}
		const last = found.lastUsedAt ? new Date(found.lastUsedAt).getTime() : 0;
		if (now.getTime() - last >= API_KEY_TOUCH_INTERVAL_MS) {
			await this.deps.store.touch(found.id, now);
		}
		return {
			sub: found.userId,
			sid: `api-key:${found.id}`,
			orgId: found.organizationId,
			role,
			via: "api_key",
		};
	}

	private now(): Date {
		return this.deps.now?.() ?? new Date();
	}

	private async record(
		user: AuthUser,
		action: string,
		apiKey: ApiKey,
		context: RequestContext,
	): Promise<void> {
		await this.deps.audit.record({
			ownerId: user.sub,
			actorId: user.sub,
			action,
			subjectType: "api_key",
			subjectId: apiKey.id,
			requestId: context.requestId,
			data: { name: apiKey.name, prefix: apiKey.prefix, organizationId: apiKey.organizationId },
			provenance: null,
		});
	}
}

function invalidKey(): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.UNAUTHORIZED,
		code: AUTH_ERROR_CODES.API_KEY_INVALID,
		message: AUTH_MESSAGES.API_KEY_INVALID,
	});
}
