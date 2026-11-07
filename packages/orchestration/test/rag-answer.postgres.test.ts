import { afterAll, describe, expect, test } from "bun:test";

import { createPostgresCheckpointer } from "@synapse/adapters/checkpointer";

import { createApprovalGatedGraph, createRagAnswerGraph, type RagAnswerPorts } from "../src";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;

type Answer = { text: string; citations: string[] };

describe.skipIf(!url)("rag answer graph with Postgres checkpoints", () => {
	const checkpointers: Array<{ close(): Promise<void> }> = [];

	afterAll(async () => {
		await Promise.all(checkpointers.map((checkpointer) => checkpointer.close()));
	});

	/** A "process": its own checkpointer connection and graph, like a worker after a restart. */
	async function startProcess(ports: RagAnswerPorts<{ id: string }, Answer>) {
		const checkpointer = createPostgresCheckpointer({
			connectionString: url ?? "",
			schema: "langgraph_test",
		});
		checkpointers.push(checkpointer);
		await checkpointer.setup();
		return createRagAnswerGraph({ ports, checkpointer: checkpointer.saver });
	}

	test("a run killed during generation resumes in a new process from its checkpoint", async () => {
		const threadId = `it-${crypto.randomUUID()}`;
		const first = { retrieve: 0, answer: 0 };
		const crashing = await startProcess({
			async retrieve() {
				first.retrieve += 1;
				return [{ id: "p1" }, { id: "p2" }];
			},
			async answer() {
				first.answer += 1;
				throw new Error("process killed");
			},
		});
		await expect(
			crashing.run({ question: "how long do refunds take?", context: undefined }, threadId),
		).rejects.toThrow("process killed");

		const second = { retrieve: 0, answer: 0 };
		const restarted = await startProcess({
			async retrieve() {
				second.retrieve += 1;
				return [];
			},
			async answer({ question, passages }) {
				second.answer += 1;
				return { text: `${question} → ${passages.length} passages [1]`, citations: ["p1"] };
			},
		});
		const run = await restarted.resume(threadId);

		// The new process never retrieved: passages came from the checkpoint.
		expect(second.retrieve).toBe(0);
		expect(second.answer).toBe(1);
		expect(run).toEqual({
			passages: [{ id: "p1" }, { id: "p2" }],
			answer: { text: "how long do refunds take? → 2 passages [1]", citations: ["p1"] },
			attempts: 1,
		});
		expect(first).toEqual({ retrieve: 1, answer: 1 });
	}, 30_000);

	test("a run paused for approval is approved and finished by a new process", async () => {
		const approvalId = crypto.randomUUID();
		const executed: string[] = [];
		const startApprovalProcess = async (name: string) => {
			const checkpointer = createPostgresCheckpointer({
				connectionString: url ?? "",
				schema: "langgraph_test",
			});
			checkpointers.push(checkpointer);
			await checkpointer.setup();
			return createApprovalGatedGraph<{ ownerId: string }, { by: string }>({
				checkpointer: checkpointer.saver,
				ports: {
					async requestApproval() {},
					async execute() {
						executed.push(name);
						return { by: name };
					},
				},
			});
		};

		const api = await startApprovalProcess("first");
		expect((await api.start(approvalId, { ownerId: "u1" })).status).toBe("awaiting_approval");

		// Deploy: the first process is gone; another one receives the approval.
		const restarted = await startApprovalProcess("second");
		expect(await restarted.decide(approvalId, { approved: true, decidedBy: "u1" })).toEqual({
			status: "done",
			approvalId,
			result: { by: "second" },
		});
		expect(executed).toEqual(["second"]);
	}, 30_000);
});
