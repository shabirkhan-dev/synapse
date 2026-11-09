import { describe, expect, test } from "bun:test";

import { type AuditEvent, type AuditStore, createAuditLog, type StoredAuditEvent } from "../src";

function memoryStore(): AuditStore & { rows: StoredAuditEvent[] } {
	const rows: StoredAuditEvent[] = [];
	return {
		rows,
		async append(event) {
			const stored = { ...event, id: String(rows.length + 1), createdAt: new Date().toISOString() };
			rows.push(stored);
			return stored;
		},
		async list({ ownerId, limit, action, actorId }) {
			return rows
				.filter(
					(row) =>
						row.ownerId === ownerId &&
						(!action || row.action === action) &&
						(!actorId || row.actorId === actorId),
				)
				.toReversed()
				.slice(0, limit);
		},
	};
}

const event: AuditEvent = {
	ownerId: "u1",
	actorId: "u1",
	action: "rag.query.answered",
	subjectType: "query",
	subjectId: null,
	requestId: "req_1",
	data: { question: "secret: hunter2" },
	provenance: null,
};

describe("audit log", () => {
	test("redacts data before it is stored", async () => {
		const store = memoryStore();
		const audit = createAuditLog({
			store,
			redact: (data) => ({ ...data, question: "[redacted]" }),
		});
		const stored = await audit.record(event);
		expect(stored.data).toEqual({ question: "[redacted]" });
		expect(store.rows[0]?.data).toEqual({ question: "[redacted]" });
	});

	test("lists an owner's events newest first, optionally by action", async () => {
		const audit = createAuditLog({ store: memoryStore(), redact: (data) => data });
		await audit.record(event);
		await audit.record({ ...event, action: "rag.document.ingested" });
		await audit.record({ ...event, ownerId: "u2" });
		expect((await audit.list("u1", { limit: 10 })).map((e) => e.action)).toEqual([
			"rag.document.ingested",
			"rag.query.answered",
		]);
		expect(await audit.list("u1", { limit: 10, action: "rag.query.answered" })).toHaveLength(1);
		await audit.record({ ...event, actorId: "u9" });
		expect(await audit.list("u1", { limit: 10, actorId: "u9" })).toHaveLength(1);
	});
});
