import { and, count, eq, isNull, lt, or } from "drizzle-orm";

import { type Database, mfaRecoveryCodes, users } from "@synapse/database";

import type { MfaState, MfaStore } from "../types/mfa.types";

export class DrizzleMfaRepository implements MfaStore {
	constructor(private readonly db: Database) {}

	async get(userId: string): Promise<MfaState | null> {
		const [row] = await this.db
			.select({
				secret: users.mfaSecret,
				pendingSecret: users.mfaPendingSecret,
				enabledAt: users.mfaEnabledAt,
				lastCounter: users.mfaLastCounter,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		return row ? { ...row, enabledAt: row.enabledAt?.toISOString() ?? null } : null;
	}

	async setPending(userId: string, sealedSecret: string): Promise<void> {
		await this.db
			.update(users)
			.set({ mfaPendingSecret: sealedSecret, updatedAt: new Date() })
			.where(eq(users.id, userId));
	}

	async enable(
		userId: string,
		{
			sealedSecret,
			counter,
			recoveryCodeHashes,
		}: { sealedSecret: string; counter: number; recoveryCodeHashes: string[] },
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({
					mfaSecret: sealedSecret,
					mfaPendingSecret: null,
					mfaEnabledAt: new Date(),
					mfaLastCounter: counter,
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId));
			await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
			await tx
				.insert(mfaRecoveryCodes)
				.values(recoveryCodeHashes.map((codeHash) => ({ userId, codeHash })));
		});
	}

	async disable(userId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({
					mfaSecret: null,
					mfaPendingSecret: null,
					mfaEnabledAt: null,
					mfaLastCounter: null,
					updatedAt: new Date(),
				})
				.where(eq(users.id, userId));
			await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
		});
	}

	async acceptCounter(userId: string, counter: number): Promise<boolean> {
		const rows = await this.db
			.update(users)
			.set({ mfaLastCounter: counter })
			.where(
				and(
					eq(users.id, userId),
					or(isNull(users.mfaLastCounter), lt(users.mfaLastCounter, counter)),
				),
			)
			.returning({ id: users.id });
		return rows.length > 0;
	}

	async useRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
		const rows = await this.db
			.update(mfaRecoveryCodes)
			.set({ usedAt: new Date() })
			.where(
				and(
					eq(mfaRecoveryCodes.userId, userId),
					eq(mfaRecoveryCodes.codeHash, codeHash),
					isNull(mfaRecoveryCodes.usedAt),
				),
			)
			.returning({ id: mfaRecoveryCodes.id });
		return rows.length > 0;
	}

	async countRecoveryCodes(userId: string): Promise<number> {
		const [row] = await this.db
			.select({ left: count() })
			.from(mfaRecoveryCodes)
			.where(and(eq(mfaRecoveryCodes.userId, userId), isNull(mfaRecoveryCodes.usedAt)));
		return row?.left ?? 0;
	}
}
