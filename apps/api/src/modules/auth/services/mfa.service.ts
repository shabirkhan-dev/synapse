import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import {
	createRecoveryCodes,
	createTotpSecret,
	hashSecretToken,
	normalizeRecoveryCode,
	openSecret,
	sealSecret,
	totpUri,
	verifyTotp,
} from "@synapse/security";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/types/app-types";

import {
	AUTH_ERROR_CODES,
	AUTH_MESSAGES,
	AUTH_RATE_LIMITS,
	MFA_ISSUER,
} from "../constants/auth.constants";
import type { RateLimiter } from "../types/auth.types";
import type { MfaStatus, MfaStore } from "../types/mfa.types";

export type MfaServiceDependencies = {
	store: MfaStore;
	rateLimiter: RateLimiter;
	/** AES-256-GCM key for TOTP secrets at rest (`AUTH_ENCRYPTION_KEY`). */
	encryptionKey: Uint8Array;
	/** The account's email, for the label authenticator apps show. */
	emailOf: (userId: string) => Promise<string | null>;
	audit: AuditLog;
	now?: () => Date;
};

/**
 * Two-step sign-in (syn-084): a TOTP secret per user (RFC 6238, sealed at rest), confirmed with a
 * first code before it is on, plus ten one-time recovery codes. Codes are rate-limited per user and
 * each works once.
 */
export class MfaService {
	constructor(private readonly deps: MfaServiceDependencies) {}

	async status(userId: string): Promise<MfaStatus> {
		const state = await this.deps.store.get(userId);
		const enabled = Boolean(state?.enabledAt);
		return {
			enabled,
			recoveryCodesLeft: enabled ? await this.deps.store.countRecoveryCodes(userId) : 0,
		};
	}

	isEnabled(userId: string): Promise<boolean> {
		return this.deps.store.get(userId).then((state) => Boolean(state?.enabledAt));
	}

	/** A new secret to scan; it is kept as pending until `enable` confirms a code from it. */
	async setup(userId: string): Promise<{ secret: string; uri: string }> {
		if (await this.isEnabled(userId)) throw alreadyEnabled();
		const secret = createTotpSecret();
		await this.deps.store.setPending(userId, sealSecret(secret, this.deps.encryptionKey));
		const account = (await this.deps.emailOf(userId)) ?? userId;
		return { secret, uri: totpUri({ issuer: MFA_ISSUER, account, secret }) };
	}

	/** Confirm the pending secret with a code; returns the recovery codes (shown once). */
	async enable(userId: string, code: string, context: RequestContext): Promise<string[]> {
		await this.limit(userId);
		const state = await this.deps.store.get(userId);
		if (state?.enabledAt) throw alreadyEnabled();
		if (!state?.pendingSecret)
			throw badRequest(AUTH_ERROR_CODES.MFA_NOT_SET_UP, AUTH_MESSAGES.MFA_NOT_SET_UP);
		const secret = openSecret(state.pendingSecret, this.deps.encryptionKey);
		const counter = verifyTotp(secret, code, this.now());
		if (counter === null)
			throw badRequest(AUTH_ERROR_CODES.MFA_CODE_INVALID, AUTH_MESSAGES.MFA_CODE_INVALID);
		const recoveryCodes = createRecoveryCodes();
		await this.deps.store.enable(userId, {
			sealedSecret: state.pendingSecret,
			counter,
			recoveryCodeHashes: recoveryCodes.map((item) => hashSecretToken(normalizeRecoveryCode(item))),
		});
		await this.record(AUDIT_ACTIONS.AUTH_MFA_ENABLED, userId, context);
		return recoveryCodes;
	}

	/** Turn it off; needs a current code or a recovery code. */
	async disable(userId: string, code: string, context: RequestContext): Promise<void> {
		if (!(await this.isEnabled(userId)))
			throw badRequest(AUTH_ERROR_CODES.MFA_NOT_ENABLED, AUTH_MESSAGES.MFA_NOT_ENABLED);
		if (!(await this.verify(userId, code, context))) {
			throw badRequest(AUTH_ERROR_CODES.MFA_CODE_INVALID, AUTH_MESSAGES.MFA_CODE_INVALID);
		}
		await this.deps.store.disable(userId);
		await this.record(AUDIT_ACTIONS.AUTH_MFA_DISABLED, userId, context);
	}

	/**
	 * Whether `code` is a current authenticator code not used before, or an unused recovery code
	 * (which is then spent). Rate-limited per user (429 when exceeded).
	 */
	async verify(userId: string, code: string, context: RequestContext): Promise<boolean> {
		await this.limit(userId);
		const state = await this.deps.store.get(userId);
		if (!state?.enabledAt || !state.secret) return false;
		const secret = openSecret(state.secret, this.deps.encryptionKey);
		const counter = verifyTotp(secret, code, this.now(), { after: state.lastCounter ?? -1 });
		if (counter !== null) return this.deps.store.acceptCounter(userId, counter);
		const recovery = normalizeRecoveryCode(code);
		if (recovery.length !== 10) return false;
		const used = await this.deps.store.useRecoveryCode(userId, hashSecretToken(recovery));
		if (used) await this.record(AUDIT_ACTIONS.AUTH_MFA_RECOVERY_CODE_USED, userId, context);
		return used;
	}

	private async limit(userId: string): Promise<void> {
		const { allowed, retryAfterSeconds } = await this.deps.rateLimiter.hit(
			hashSecretToken(`mfa:user:${userId}`),
			AUTH_RATE_LIMITS.MFA_CODE_PER_USER,
		);
		if (!allowed) {
			throw new AppError({
				statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
				code: AUTH_ERROR_CODES.RATE_LIMITED,
				message: AUTH_MESSAGES.RATE_LIMITED,
				details: [{ retryAfterSeconds }],
			});
		}
	}

	private now(): Date {
		return this.deps.now?.() ?? new Date();
	}

	private async record(action: string, userId: string, context: RequestContext): Promise<void> {
		await this.deps.audit.record({
			ownerId: userId,
			actorId: userId,
			action,
			subjectType: "user",
			subjectId: userId,
			requestId: context.requestId,
			data: {},
			provenance: null,
		});
	}
}

function alreadyEnabled(): AppError {
	return new AppError({
		statusCode: HTTP_STATUS.CONFLICT,
		code: AUTH_ERROR_CODES.MFA_ALREADY_ENABLED,
		message: AUTH_MESSAGES.MFA_ALREADY_ENABLED,
	});
}

function badRequest(code: string, message: string): AppError {
	return new AppError({ statusCode: HTTP_STATUS.BAD_REQUEST, code, message });
}
