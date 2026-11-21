/** A user's two-step sign-in state as stored (secrets sealed with `AUTH_ENCRYPTION_KEY`). */
export type MfaState = {
	secret: string | null;
	pendingSecret: string | null;
	enabledAt: string | null;
	lastCounter: number | null;
};

export type MfaStatus = { enabled: boolean; recoveryCodesLeft: number };

/** Persistence port; `DrizzleMfaRepository` in production, an in-memory one in tests. */
export interface MfaStore {
	get(userId: string): Promise<MfaState | null>;
	setPending(userId: string, sealedSecret: string): Promise<void>;
	/** Turn it on with the pending secret, the counter just used and fresh recovery codes. */
	enable(
		userId: string,
		input: { sealedSecret: string; counter: number; recoveryCodeHashes: string[] },
	): Promise<void>;
	/** Clear the secrets and recovery codes. */
	disable(userId: string): Promise<void>;
	/** Record `counter` as used, only if it is newer than the last one (a code works once). */
	acceptCounter(userId: string, counter: number): Promise<boolean>;
	/** Mark an unused recovery code used; `false` if there is none with this hash. */
	useRecoveryCode(userId: string, codeHash: string): Promise<boolean>;
	countRecoveryCodes(userId: string): Promise<number>;
}
