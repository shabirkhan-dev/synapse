import { and, desc, eq } from "drizzle-orm";

import type { AuditEvent, AuditStore, StoredAuditEvent } from "@synapse/audit";
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
	}: {
		ownerId: string;
		limit: number;
		action?: string;
	}): Promise<StoredAuditEvent[]> {
		const rows = await this.db
			.select()
			.from(auditEvents)
			.where(
				and(eq(auditEvents.ownerId, ownerId), action ? eq(auditEvents.action, action) : undefined),
			)
			.orderBy(desc(auditEvents.createdAt))
			.limit(limit);
		return rows.map(toStoredAuditEvent);
	}
}
