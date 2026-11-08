import type { StoredAuditEvent } from "@synapse/audit";
import type { AuditEventRow } from "@synapse/database";

export function toStoredAuditEvent(row: AuditEventRow): StoredAuditEvent {
	return {
		id: row.id,
		ownerId: row.ownerId,
		actorId: row.actorId,
		action: row.action,
		subjectType: row.subjectType,
		subjectId: row.subjectId,
		requestId: row.requestId,
		data: row.data,
		provenance: row.provenance ?? null,
		createdAt: row.createdAt.toISOString(),
	};
}
