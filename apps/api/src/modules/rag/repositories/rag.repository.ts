import {
	and,
	asc,
	cosineDistance,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
	sql,
	type SQL,
} from "drizzle-orm";

import {
	chunkSearchText,
	type Database,
	organizationMembers,
	ragChunks,
	ragDocumentMembers,
	ragDocuments,
	searchQuery,
	searchVector,
} from "@synapse/database";
import type { DocumentReader, KeywordSearchRequest, VectorSearchRequest } from "@synapse/retrieval";

import { containsPattern } from "@/shared/utils/like-pattern";

import { toRagDocument } from "../mappers/rag.mapper";
import type {
	NewRagChunk,
	DocumentAccess,
	NewRagDocument,
	RagChunk,
	RagDocument,
	RagMatch,
	RagReader,
	RagRepository,
} from "../types/rag.types";

/**
 * The documents a reader may read (ADR-0008), as a condition on `rag_documents`: everything for
 * `readsAll`; otherwise open documents, their own and those shared with them. No reader means open
 * documents only, so a caller that forgets the reader can never reach a restricted one.
 */
function readableBy(reader: DocumentReader | undefined): SQL | undefined {
	if (reader?.readsAll) return undefined;
	const open = eq(ragDocuments.access, "organization");
	if (!reader) return open;
	return or(
		open,
		eq(ragDocuments.createdBy, reader.userId),
		sql`exists (select 1 from ${ragDocumentMembers} where ${ragDocumentMembers.documentId} = ${ragDocuments.id} and ${ragDocumentMembers.userId} = ${reader.userId})`,
	);
}

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
					access: document.access ?? "organization",
					createdBy: document.createdBy ?? null,
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
						context: chunk.context ?? null,
						embedding: chunk.embedding,
						chunkerVersion: chunk.chunkerVersion ?? null,
						embeddingModel: chunk.embeddingModel ?? null,
					})),
				);
			}
			return toRagDocument(row);
		});
	}

	async listDocuments(
		reader: RagReader,
		limit: number,
		titleContains?: string,
	): Promise<RagDocument[]> {
		const rows = await this.db
			.select()
			.from(ragDocuments)
			.where(
				and(
					eq(ragDocuments.ownerId, reader.ownerId),
					readableBy(reader),
					titleContains ? ilike(ragDocuments.title, containsPattern(titleContains)) : undefined,
				),
			)
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

	async findDocument(reader: RagReader, documentId: string): Promise<RagDocument | null> {
		const [row] = await this.db
			.select()
			.from(ragDocuments)
			.where(
				and(
					eq(ragDocuments.id, documentId),
					eq(ragDocuments.ownerId, reader.ownerId),
					readableBy(reader),
				),
			)
			.limit(1);
		return row ? toRagDocument(row) : null;
	}

	async listChunks({
		ownerId,
		documentId,
		offset,
		limit,
	}: {
		ownerId: string;
		documentId: string;
		offset: number;
		limit: number;
	}): Promise<RagChunk[]> {
		return this.db
			.select({
				id: ragChunks.id,
				chunkIndex: ragChunks.chunkIndex,
				content: ragChunks.content,
				context: ragChunks.context,
				chunkerVersion: ragChunks.chunkerVersion,
				embeddingModel: ragChunks.embeddingModel,
			})
			.from(ragChunks)
			.where(and(eq(ragChunks.documentId, documentId), eq(ragChunks.ownerId, ownerId)))
			.orderBy(asc(ragChunks.chunkIndex))
			.offset(offset)
			.limit(limit);
	}

	async deleteDocument(reader: RagReader, documentId: string): Promise<boolean> {
		const rows = await this.db
			.delete(ragDocuments)
			.where(
				and(
					eq(ragDocuments.id, documentId),
					eq(ragDocuments.ownerId, reader.ownerId),
					readableBy(reader),
				),
			)
			.returning({ id: ragDocuments.id });
		return rows.length > 0;
	}

	async deleteAllDocuments(ownerId: string): Promise<number> {
		const rows = await this.db
			.delete(ragDocuments)
			.where(eq(ragDocuments.ownerId, ownerId))
			.returning({ id: ragDocuments.id });
		return rows.length;
	}

	async searchChunks({
		ownerId,
		embedding,
		embeddingModel,
		limit,
		documentIds,
		reader,
	}: VectorSearchRequest): Promise<RagMatch[]> {
		const distance = cosineDistance(ragChunks.embedding, embedding);
		const scoped = documentIds?.length ? [...documentIds] : null;
		const rows = await this.db.transaction(async (tx) => {
			// A few chosen documents are always searched exactly. Postgres usually plans that itself
			// (filter, then sort); this rules out the HNSW plan, which filters after walking the
			// index and can stop (`hnsw.max_scan_tuples`) before it meets their chunks.
			if (scoped) await tx.execute(sql`set local enable_indexscan = off`);
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
							scoped ? inArray(ragChunks.documentId, scoped) : undefined,
							// Per-document access, inside the query: unreadable chunks are never ranked.
							readableBy(reader),
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

	async keywordSearch({
		ownerId,
		query,
		limit,
		documentIds,
		reader,
	}: KeywordSearchRequest): Promise<RagMatch[]> {
		const vector = searchVector(chunkSearchText(ragChunks));
		const tsQuery = searchQuery(query);
		const rank = sql<number>`ts_rank_cd(${vector}, ${tsQuery})`;
		const rows = await this.db
			.select({ ...matchColumns, score: rank })
			.from(ragChunks)
			.innerJoin(ragDocuments, eq(ragDocuments.id, ragChunks.documentId))
			// The @@ on the indexed expression uses the GIN index.
			.where(
				and(
					eq(ragChunks.ownerId, ownerId),
					documentIds?.length ? inArray(ragChunks.documentId, [...documentIds]) : undefined,
					readableBy(reader),
					sql`${vector} @@ ${tsQuery}`,
				),
			)
			.orderBy(desc(rank), ...tieBreak)
			.limit(limit);
		return rows.map(withNumericScore);
	}

	async listDocumentMembers(documentId: string): Promise<string[]> {
		const rows = await this.db
			.select({ userId: ragDocumentMembers.userId })
			.from(ragDocumentMembers)
			.where(eq(ragDocumentMembers.documentId, documentId))
			.orderBy(asc(ragDocumentMembers.createdAt), asc(ragDocumentMembers.userId));
		return rows.map((row) => row.userId);
	}

	async setDocumentAccess({
		ownerId,
		documentId,
		access,
		userIds,
	}: {
		ownerId: string;
		documentId: string;
		access: DocumentAccess;
		userIds: readonly string[];
	}): Promise<string[] | null> {
		return this.db.transaction(async (tx) => {
			const updated = await tx
				.update(ragDocuments)
				.set({ access, updatedAt: new Date() })
				.where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.ownerId, ownerId)))
				.returning({ id: ragDocuments.id });
			if (updated.length === 0) return null;
			await tx.delete(ragDocumentMembers).where(eq(ragDocumentMembers.documentId, documentId));
			if (access === "organization" || userIds.length === 0) return [];
			// Only members of this organization can be given access.
			const members = await tx
				.select({ userId: organizationMembers.userId })
				.from(organizationMembers)
				.where(
					and(
						sql`${organizationMembers.organizationId}::text = ${ownerId}`,
						inArray(organizationMembers.userId, [...userIds]),
					),
				);
			if (members.length === 0) return [];
			await tx
				.insert(ragDocumentMembers)
				.values(members.map(({ userId }) => ({ documentId, userId })))
				.onConflictDoNothing();
			return userIds.filter((id) => members.some((member) => member.userId === id));
		});
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
	context: ragChunks.context,
};

/** Numeric SQL expressions come back as strings from postgres-js. */
function withNumericScore<TRow extends { score: number }>(row: TRow): TRow {
	row.score = Number(row.score);
	return row;
}
