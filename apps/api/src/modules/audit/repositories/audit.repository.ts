import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import type { AuditEvent, AuditStore, StoredAuditEvent, UsageGroup } from "@synapse/audit";
import { auditEvents, type Database } from "@synapse/database";

import { toStoredAuditEvent } from "../mappers/audit.mapper";

/** Insert and read only: the table rejects updates (trigger). */
export class DrizzleAuditRepository implements AuditStore {
	constructor(private readonly db: Database) {}

	async append(event: AuditEvent): Promise<StoredAuditEvent> {
		const [row] = await this.db.insert(auditEvents).values(event).returning();
		if (!row) {
			throw new Error("Failed to insert audit event");
		}
		return toStoredAuditEvent(row);
	}

	async list({
		ownerId,
		limit,
		action,
		actorId,
	}: {
		ownerId: string;
		limit: number;
		action?: string;
		actorId?: string;
	}): Promise<StoredAuditEvent[]> {
		const rows = await this.db
			.select()
			.from(auditEvents)
			.where(
				and(
					eq(auditEvents.ownerId, ownerId),
					action ? eq(auditEvents.action, action) : undefined,
					actorId ? eq(auditEvents.actorId, actorId) : undefined,
				),
			)
			.orderBy(desc(auditEvents.createdAt))
			.limit(limit);
		return rows.map(toStoredAuditEvent);
	}

	async usage({
		ownerId,
		action,
		since,
		actorId,
	}: {
		ownerId: string;
		action: string;
		since: Date;
		actorId?: string;
	}): Promise<UsageGroup[]> {
		const day = sql<string>`to_char(${auditEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
		const chatModel = sql<string>`${auditEvents.provenance}->>'chatModel'`;
		const promptVersion = sql<string>`${auditEvents.provenance}->>'promptVersion'`;
		const embeddingModel = sql<string>`${auditEvents.provenance}->>'embeddingModel'`;
		return this.db
			.select({
				day,
				chatModel,
				promptVersion,
				embeddingModel,
				answers: sql<number>`count(*)::int`,
				inputTokens: sql<number>`coalesce(sum((${auditEvents.provenance}->'usage'->>'inputTokens')::bigint), 0)::int`,
				outputTokens: sql<number>`coalesce(sum((${auditEvents.provenance}->'usage'->>'outputTokens')::bigint), 0)::int`,
			})
			.from(auditEvents)
			.where(
				and(
					eq(auditEvents.ownerId, ownerId),
					eq(auditEvents.action, action),
					gte(auditEvents.createdAt, since),
					isNotNull(auditEvents.provenance),
					actorId ? eq(auditEvents.actorId, actorId) : undefined,
				),
			)
			.groupBy(day, chatModel, promptVersion, embeddingModel);
	}
}
