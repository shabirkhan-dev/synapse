import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";

import { type Database, ragChunks, ragDocuments } from "@synapse/database";

import { toRagDocument } from "../mappers/rag.mapper";
import type {
	NewRagChunk,
	NewRagDocument,
	RagDocument,
	RagMatch,
	RagRepository,
} from "../types/rag.types";

export class DrizzleRagRepository implements RagRepository {
	constructor(private readonly db: Database) {}

	async createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument> {
		return this.db.transaction(async (tx) => {
			const [row] = await tx
				.insert(ragDocuments)
				.values({
					ownerId: document.ownerId,
					title: document.title,
					source: document.source ?? null,
					metadata: document.metadata ?? {},
					chunkCount: chunks.length,
					contentHash: document.contentHash ?? null,
				})
				// A concurrent ingest of the same content won the race: return its document.
				.onConflictDoNothing({ target: [ragDocuments.ownerId, ragDocuments.contentHash] })
				.returning();
			if (!row) {
				const existing = document.contentHash
					? await this.findByContentHash(document.ownerId, document.contentHash)
					: null;
				if (existing) {
					return existing;
				}
				throw new Error("Failed to insert rag document");
			}
			if (chunks.length > 0) {
				await tx.insert(ragChunks).values(
					chunks.map((chunk) => ({
						documentId: row.id,
						ownerId: document.ownerId,
						chunkIndex: chunk.chunkIndex,
						content: chunk.content,
						embedding: chunk.embedding,
					})),
				);
			}
			return toRagDocument(row);
		});
	}

	async listDocuments(ownerId: string, limit: number): Promise<RagDocument[]> {
		const rows = await this.db
			.select()
			.from(ragDocuments)
			.where(eq(ragDocuments.ownerId, ownerId))
			.orderBy(desc(ragDocuments.createdAt))
			.limit(limit);
		return rows.map(toRagDocument);
	}

	async findByContentHash(ownerId: string, contentHash: string): Promise<RagDocument | null> {
		const [row] = await this.db
			.select()
			.from(ragDocuments)
			.where(and(eq(ragDocuments.ownerId, ownerId), eq(ragDocuments.contentHash, contentHash)))
			.limit(1);
		return row ? toRagDocument(row) : null;
	}

	async deleteDocument(ownerId: string, documentId: string): Promise<boolean> {
		const rows = await this.db
			.delete(ragDocuments)
			.where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.ownerId, ownerId)))
			.returning({ id: ragDocuments.id });
		return rows.length > 0;
	}

	async searchChunks(ownerId: string, embedding: number[], topK: number): Promise<RagMatch[]> {
		const distance = cosineDistance(ragChunks.embedding, embedding);
		const rows = await this.db
			.select({
				chunkId: ragChunks.id,
				documentId: ragChunks.documentId,
				documentTitle: ragDocuments.title,
				source: ragDocuments.source,
				chunkIndex: ragChunks.chunkIndex,
				content: ragChunks.content,
				score: sql<number>`1 - (${distance})`,
			})
			.from(ragChunks)
			.innerJoin(ragDocuments, eq(ragDocuments.id, ragChunks.documentId))
			.where(eq(ragChunks.ownerId, ownerId))
			// Order by the raw distance expression so Postgres can use the HNSW index.
			.orderBy(distance)
			.limit(topK);
		for (const row of rows) {
			// numeric expressions come back as strings from postgres-js
			row.score = Number(row.score);
		}
		return rows;
	}

	async ping(): Promise<void> {
		await this.db.execute(sql`select 1`);
	}
}
