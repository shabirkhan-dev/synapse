/** Length bounds: long passphrases are welcome; the cap keeps hashing cost bounded. */
export const PASSWORD_POLICY = { minLength: 12, maxLength: 128 } as const;

/** Argon2id (Bun's default parameters); the hash string carries its own salt and parameters. */
export function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password, { algorithm: "argon2id" });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
	return Bun.password.verify(password, hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Spend the same time as a real check when the account does not exist, so response timing does
 * not reveal which emails are registered. Always resolves to `false`.
 */
export async function verifyPasswordAgainstNothing(password: string): Promise<false> {
	dummyHash ??= hashPassword(crypto.randomUUID());
	await verifyPassword(password, await dummyHash);
	return false;
}
