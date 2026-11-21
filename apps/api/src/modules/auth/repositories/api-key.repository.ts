import { and, count, desc, eq } from "drizzle-orm";

import { type ApiKeyRow, apiKeys, type Database } from "@synapse/database";

import type { ApiKey, ApiKeyStore } from "../types/api-key.types";

export class DrizzleApiKeyRepository implements ApiKeyStore {
	constructor(private readonly db: Database) {}

	async create(input: {
		userId: string;
		organizationId: string;
		name: string;
		prefix: string;
		keyHash: string;
		expiresAt: Date | null;
	}): Promise<ApiKey> {
		const [row] = await this.db.insert(apiKeys).values(input).returning();
		if (!row) throw new Error("Failed to insert API key");
		return toApiKey(row);
	}

	async list(userId: string): Promise<ApiKey[]> {
		const rows = await this.db
			.select()
			.from(apiKeys)
			.where(eq(apiKeys.userId, userId))
			.orderBy(desc(apiKeys.createdAt));
		return rows.map(toApiKey);
	}

	async count(userId: string): Promise<number> {
		const [row] = await this.db
			.select({ keys: count() })
			.from(apiKeys)
			.where(eq(apiKeys.userId, userId));
		return row?.keys ?? 0;
	}

	async remove(userId: string, id: string): Promise<boolean> {
		const rows = await this.db
			.delete(apiKeys)
			.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
			.returning({ id: apiKeys.id });
		return rows.length > 0;
	}

	async findByHash(keyHash: string): Promise<(ApiKey & { userId: string }) | null> {
		const [row] = await this.db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
		return row ? { ...toApiKey(row), userId: row.userId } : null;
	}

	async touch(id: string, at: Date): Promise<void> {
		await this.db.update(apiKeys).set({ lastUsedAt: at }).where(eq(apiKeys.id, id));
	}
}

function toApiKey(row: ApiKeyRow): ApiKey {
	return {
		id: row.id,
		name: row.name,
		prefix: row.prefix,
		organizationId: row.organizationId,
		expiresAt: row.expiresAt?.toISOString() ?? null,
		lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	};
}
