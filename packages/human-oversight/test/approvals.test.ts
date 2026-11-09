import { describe, expect, test } from "bun:test";

import { type ApprovalRequest, type ApprovalStore, createApprovals, createFeedback } from "../src";

function memoryStore(): ApprovalStore {
	const rows: ApprovalRequest[] = [];
	return {
		async create(input) {
			if (rows.some((row) => row.id === input.id)) return;
			rows.push({
				...input,
				status: "pending",
				reason: null,
				decidedBy: null,
				decidedAt: null,
				createdAt: new Date().toISOString(),
			});
		},
		async find({ id, ownerId }) {
			return rows.find((row) => row.id === id && row.ownerId === ownerId) ?? null;
		},
		async listPending(ownerId, _limit, requestedBy) {
			return rows.filter(
				(row) =>
					row.ownerId === ownerId &&
					row.status === "pending" &&
					(!requestedBy || row.requestedBy === requestedBy),
			);
		},
		async decide({ id, ownerId, approved, decidedBy, reason }) {
			const row = rows.find((r) => r.id === id && r.ownerId === ownerId && r.status === "pending");
			if (!row) return null;
			Object.assign(row, {
				status: approved ? "approved" : "rejected",
				decidedBy,
				reason: reason ?? null,
				decidedAt: new Date().toISOString(),
			});
			return row;
		},
	};
}

const request = {
	id: "a1",
	ownerId: "u1",
	action: "rag.purge-documents",
	summary: "Delete 3 documents",
	requestedBy: "u1",
};

describe("approvals", () => {
	test("a request waits in the owner's queue until decided", async () => {
		const approvals = createApprovals(memoryStore());
		await approvals.request(request);
		await approvals.request(request);
		expect(await approvals.pending("u1")).toHaveLength(1);
		expect(await approvals.pending("u2")).toEqual([]);
		expect(await approvals.pending("u1", { requestedBy: "someone-else" })).toEqual([]);

		const decided = await approvals.decide("a1", "u1", { approved: true, decidedBy: "u1" });
		expect(decided).toMatchObject({ status: "approved", decidedBy: "u1" });
		expect(await approvals.pending("u1")).toEqual([]);
	});

	test("repeating the same decision is safe; changing it is refused", async () => {
		const approvals = createApprovals(memoryStore());
		await approvals.request(request);
		await approvals.decide("a1", "u1", { approved: false, decidedBy: "u1", reason: "not now" });
		expect(await approvals.decide("a1", "u1", { approved: false, decidedBy: "u1" })).toMatchObject({
			status: "rejected",
			reason: "not now",
		});
		await expect(
			approvals.decide("a1", "u1", { approved: true, decidedBy: "u1" }),
		).rejects.toMatchObject({
			code: "OVERSIGHT_APPROVAL_ALREADY_DECIDED",
		});
	});

	test("another owner cannot see or decide a request", async () => {
		const approvals = createApprovals(memoryStore());
		await approvals.request(request);
		await expect(
			approvals.decide("a1", "u2", { approved: true, decidedBy: "u2" }),
		).rejects.toMatchObject({
			code: "OVERSIGHT_APPROVAL_NOT_FOUND",
		});
	});
});

describe("feedback", () => {
	test("stores a trimmed comment, or null for a blank one", async () => {
		const saved: unknown[] = [];
		const feedback = createFeedback({
			async upsert(input) {
				saved.push(input);
				return { ...input, createdAt: "now" };
			},
		});
		await feedback.record({
			ownerId: "u1",
			requestId: "req_1",
			rating: "up",
			comment: "  great  ",
		});
		await feedback.record({ ownerId: "u1", requestId: "req_2", rating: "down", comment: "   " });
		expect(saved).toEqual([
			{ ownerId: "u1", requestId: "req_1", rating: "up", comment: "great" },
			{ ownerId: "u1", requestId: "req_2", rating: "down", comment: null },
		]);
	});
});
