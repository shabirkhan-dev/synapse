import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";

import { type Database, memoryFacts } from "@synapse/database";
import type { FactStore, MemoryFact, RecalledFact } from "@synapse/memory";

import { toMemoryFact } from "../mappers/memory.mapper";

export class DrizzleFactRepository implements FactStore {
	constructor(private readonly db: Database) {}

	async save(input: {
		ownerId: string;
		content: string;
		embedding: number[];
		embeddingModel: string;
	}): Promise<MemoryFact> {
		const [inserted] = await this.db
			.insert(memoryFacts)
			.values(input)
			.onConflictDoNothing({ target: [memoryFacts.ownerId, memoryFacts.content] })
			.returning();
		if (inserted) {
			return toMemoryFact(inserted);
		}
		const [existing] = await this.db
			.select()
			.from(memoryFacts)
			.where(and(eq(memoryFacts.ownerId, input.ownerId), eq(memoryFacts.content, input.content)))
			.limit(1);
		if (!existing) {
			throw new Error("Fact neither inserted nor found");
		}
		return toMemoryFact(existing);
	}

	async search({
		ownerId,
		embedding,
		embeddingModel,
		limit,
	}: {
		ownerId: string;
		embedding: number[];
		embeddingModel: string;
		limit: number;
	}): Promise<RecalledFact[]> {
		const distance = cosineDistance(memoryFacts.embedding, embedding);
		const rows = await this.db
			.select({
				id: memoryFacts.id,
				content: memoryFacts.content,
				createdAt: memoryFacts.createdAt,
				score: sql<number>`1 - (${distance})`,
			})
			.from(memoryFacts)
			.where(and(eq(memoryFacts.ownerId, ownerId), eq(memoryFacts.embeddingModel, embeddingModel)))
			.orderBy(distance)
			.limit(limit);
		return rows.map((row) => Object.assign(toMemoryFact(row), { score: Number(row.score) }));
	}

	async list(ownerId: string, limit: number): Promise<MemoryFact[]> {
		const rows = await this.db
			.select({
				id: memoryFacts.id,
				content: memoryFacts.content,
				createdAt: memoryFacts.createdAt,
			})
			.from(memoryFacts)
			.where(eq(memoryFacts.ownerId, ownerId))
			.orderBy(desc(memoryFacts.createdAt))
			.limit(limit);
		return rows.map(toMemoryFact);
	}

	async remove({ ownerId, id }: { ownerId: string; id: string }): Promise<boolean> {
		const rows = await this.db
			.delete(memoryFacts)
			.where(and(eq(memoryFacts.id, id), eq(memoryFacts.ownerId, ownerId)))
			.returning({ id: memoryFacts.id });
		return rows.length > 0;
	}

	async removeAll(ownerId: string): Promise<number> {
		const rows = await this.db
			.delete(memoryFacts)
			.where(eq(memoryFacts.ownerId, ownerId))
			.returning({ id: memoryFacts.id });
		return rows.length;
	}
}
