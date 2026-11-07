import { and, cosineDistance, desc, eq, isNull, or, sql } from "drizzle-orm";

import {
	type Database,
	ragChunks,
	ragDocuments,
	searchQuery,
	searchVector,
} from "@synapse/database";
import type { KeywordSearchRequest, VectorSearchRequest } from "@synapse/retrieval";

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
						chunkerVersion: chunk.chunkerVersion ?? null,
						embeddingModel: chunk.embeddingModel ?? null,
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

	async searchChunks({
		ownerId,
		embedding,
		embeddingModel,
		limit,
	}: VectorSearchRequest): Promise<RagMatch[]> {
		const distance = cosineDistance(ragChunks.embedding, embedding);
		const rows = await this.db.transaction(async (tx) => {
			// HNSW fetches `ef_search` nearest candidates across all owners before the owner filter,
			// so a tenant among many could get fewer than `limit` rows. Iterative scans (pgvector
			// 0.8+) keep scanning until the limit is filled; relaxed order is re-sorted below.
			await tx.execute(sql`set local hnsw.iterative_scan = relaxed_order`);
			return (
				tx
					.select({
						...matchColumns,
						score: sql<number>`1 - (${distance})`,
					})
					.from(ragChunks)
					.innerJoin(ragDocuments, eq(ragDocuments.id, ragChunks.documentId))
					.where(
						and(
							eq(ragChunks.ownerId, ownerId),
							// Vectors from another model are not comparable; legacy rows have no model recorded.
							or(eq(ragChunks.embeddingModel, embeddingModel), isNull(ragChunks.embeddingModel)),
						),
					)
					// Order by the raw distance only so Postgres can use the HNSW index (extra sort keys,
					// especially from the joined table, disable it); ties are broken below.
					.orderBy(distance)
					.limit(limit)
			);
		});
		return rows.map(withNumericScore).toSorted(byScoreThenContent);
	}

	async keywordSearch({ ownerId, query, limit }: KeywordSearchRequest): Promise<RagMatch[]> {
		const vector = searchVector(ragChunks.content);
		const tsQuery = searchQuery(query);
		const rank = sql<number>`ts_rank_cd(${vector}, ${tsQuery})`;
		const rows = await this.db
			.select({ ...matchColumns, score: rank })
			.from(ragChunks)
			.innerJoin(ragDocuments, eq(ragDocuments.id, ragChunks.documentId))
			// The @@ on the indexed expression uses the GIN index.
			.where(and(eq(ragChunks.ownerId, ownerId), sql`${vector} @@ ${tsQuery}`))
			.orderBy(desc(rank), ...tieBreak)
			.limit(limit);
		return rows.map(withNumericScore);
	}

	async ping(): Promise<void> {
		await this.db.execute(sql`select 1`);
	}
}

/** Deterministic order for equal keyword ranks (content-derived, so identical across databases). */
const tieBreak = [ragDocuments.contentHash, ragChunks.chunkIndex];

/** Stable order for equal vector scores among the fetched rows. */
function byScoreThenContent(a: RagMatch, b: RagMatch): number {
	return b.score - a.score || a.content.localeCompare(b.content) || a.chunkIndex - b.chunkIndex;
}

const matchColumns = {
	chunkId: ragChunks.id,
	documentId: ragChunks.documentId,
	documentTitle: ragDocuments.title,
	source: ragDocuments.source,
	chunkIndex: ragChunks.chunkIndex,
	content: ragChunks.content,
};

/** Numeric SQL expressions come back as strings from postgres-js. */
function withNumericScore<TRow extends { score: number }>(row: TRow): TRow {
	row.score = Number(row.score);
	return row;
}
