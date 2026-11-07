import { describe, expect, test } from "bun:test";

import { type ApprovalGatedPorts, createApprovalGatedGraph, MemorySaver } from "../src";

function ports() {
	const calls = { requested: [] as string[], executed: [] as string[] };
	const value: ApprovalGatedPorts<{ ownerId: string }, { deleted: number }> = {
		async requestApproval({ approvalId }) {
			calls.requested.push(approvalId);
		},
		async execute({ ownerId }) {
			calls.executed.push(ownerId);
			return { deleted: 3 };
		},
	};
	return { value, calls };
}

const approve = { approved: true, decidedBy: "u1" };

describe("approval-gated graph", () => {
	test("pauses after requesting approval and runs the action once approved", async () => {
		const { value, calls } = ports();
		const graph = createApprovalGatedGraph({ ports: value, checkpointer: new MemorySaver() });

		expect(await graph.start("a1", { ownerId: "u1" })).toEqual({
			status: "awaiting_approval",
			approvalId: "a1",
		});
		expect(calls).toEqual({ requested: ["a1"], executed: [] });

		expect(await graph.decide("a1", approve)).toEqual({
			status: "done",
			approvalId: "a1",
			result: { deleted: 3 },
		});
		expect(calls.executed).toEqual(["u1"]);
	});

	test("a rejection ends the run without running the action", async () => {
		const { value, calls } = ports();
		const graph = createApprovalGatedGraph({ ports: value, checkpointer: new MemorySaver() });
		await graph.start("a2", { ownerId: "u1" });
		const outcome = await graph.decide("a2", { approved: false, decidedBy: "u1", reason: "no" });
		expect(outcome).toEqual({ status: "rejected", approvalId: "a2" });
		expect(calls.executed).toEqual([]);
	});

	test("a repeated decision returns the outcome without running the action again", async () => {
		const { value, calls } = ports();
		const graph = createApprovalGatedGraph({ ports: value, checkpointer: new MemorySaver() });
		await graph.start("a3", { ownerId: "u1" });
		await graph.decide("a3", approve);
		expect(await graph.decide("a3", approve)).toMatchObject({ status: "done" });
		expect(await graph.decide("a3", { approved: false, decidedBy: "u1" })).toMatchObject({
			status: "done",
		});
		expect(calls.executed).toEqual(["u1"]);
	});
});
