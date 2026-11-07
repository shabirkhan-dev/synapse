import { describe, expect, test } from "bun:test";

import { createRagAnswerGraph, MemorySaver, type RagAnswerPorts } from "../src";

type Passage = { id: string };
type Answer = { text: string; citations: string[] };

/** Ports that count calls; `answers` are returned in order, one per generation. */
function ports(passages: Passage[], answers: Array<Answer | Error>) {
	const calls = { retrieve: 0, answer: [] as number[] };
	const value: RagAnswerPorts<Passage, Answer> = {
		async retrieve() {
			calls.retrieve += 1;
			return passages;
		},
		async answer({ attempt }) {
			calls.answer.push(attempt);
			const next = answers.shift();
			if (!next) throw new Error("no answer scripted");
			if (next instanceof Error) throw next;
			return next;
		},
	};
	return { value, calls };
}

const cited: Answer = { text: "Refunds take 5 days [1]", citations: ["p1"] };
const uncited: Answer = { text: "Refunds take 5 days", citations: [] };

describe("rag answer graph", () => {
	test("a cited first answer ends the run", async () => {
		const { value, calls } = ports([{ id: "p1" }], [cited]);
		const run = await createRagAnswerGraph({ ports: value }).run({
			question: "how long do refunds take?",
			context: undefined,
		});
		expect(run).toEqual({ passages: [{ id: "p1" }], answer: cited, attempts: 1 });
		expect(calls.answer).toEqual([1]);
	});

	test("an answer without citations is generated again, with the attempt number", async () => {
		const { value, calls } = ports([{ id: "p1" }], [uncited, cited]);
		const run = await createRagAnswerGraph({ ports: value }).run({
			question: "refunds?",
			context: undefined,
		});
		expect(run.answer).toEqual(cited);
		expect(calls.answer).toEqual([1, 2]);
	});

	test("stops after maxAttempts and returns the last answer", async () => {
		const { value, calls } = ports([{ id: "p1" }], [uncited, uncited, uncited]);
		const run = await createRagAnswerGraph({ ports: value, maxAttempts: 3 }).run({
			question: "refunds?",
			context: undefined,
		});
		expect(run).toMatchObject({ answer: uncited, attempts: 3 });
		expect(calls.answer).toEqual([1, 2, 3]);
	});

	test("nothing retrieved: no model call", async () => {
		const { value, calls } = ports([], []);
		const run = await createRagAnswerGraph({ ports: value }).run({
			question: "refunds?",
			context: undefined,
		});
		expect(run).toEqual({ passages: [], answer: null, attempts: 0 });
		expect(calls.answer).toEqual([]);
	});

	test("a run that crashes mid-way resumes from its checkpoint without retrieving again", async () => {
		const { value, calls } = ports([{ id: "p1" }], [new Error("chat model timed out"), cited]);
		const graph = createRagAnswerGraph({ ports: value, checkpointer: new MemorySaver() });

		await expect(
			graph.run({ question: "refunds?", context: undefined }, "thread-1"),
		).rejects.toThrow("chat model timed out");
		const resumed = await graph.resume("thread-1");
		expect(resumed.answer).toEqual(cited);
		expect(calls.retrieve).toBe(1);
		expect(calls.answer).toEqual([1, 1]);
	});

	test("threads are independent", async () => {
		const { value } = ports([{ id: "p1" }], [cited, uncited, cited]);
		const graph = createRagAnswerGraph({ ports: value, checkpointer: new MemorySaver() });
		await graph.run({ question: "first", context: undefined }, "a");
		const second = await graph.run({ question: "second", context: undefined }, "b");
		expect(second.attempts).toBe(2);
	});
});
