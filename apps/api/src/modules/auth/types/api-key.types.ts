/** A personal API key as its owner sees it (never the key itself, which is shown once). */
export type ApiKey = {
	id: string;
	name: string;
	/** The first characters of the key (`syn_` + 8), to tell keys apart. */
	prefix: string;
	/** The organization the key acts in (the personal one = the user id). */
	organizationId: string;
	expiresAt: string | null;
	lastUsedAt: string | null;
	createdAt: string;
};

/** Persistence port; `DrizzleApiKeyRepository` in production, an in-memory one in tests. */
export interface ApiKeyStore {
	create(input: {
		userId: string;
		organizationId: string;
		name: string;
		prefix: string;
		keyHash: string;
		expiresAt: Date | null;
	}): Promise<ApiKey>;
	/** The user's keys, newest first. */
	list(userId: string): Promise<ApiKey[]>;
	count(userId: string): Promise<number>;
	/** `false` when the user has no such key. */
	remove(userId: string, id: string): Promise<boolean>;
	findByHash(keyHash: string): Promise<(ApiKey & { userId: string }) | null>;
	touch(id: string, at: Date): Promise<void>;
}
