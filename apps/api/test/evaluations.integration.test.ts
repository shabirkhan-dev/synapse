import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createDatabase, runMigrations, sourceMigrationsFolder } from "@synapse/database";

import { DrizzleEvaluationRepository } from "@/modules/evaluations";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;

describe.skipIf(!url)("DrizzleEvaluationRepository (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const repository = new DrizzleEvaluationRepository(database.db);
	const owner = `it-eval-${crypto.randomUUID()}`;
	const other = `it-eval-${crypto.randomUUID()}`;

	beforeAll(() => runMigrations(database.db, sourceMigrationsFolder));
	afterAll(() => database.close());

	test("questions keep their expected document ids and stay in their organization", async () => {
		const expected = [crypto.randomUUID(), crypto.randomUUID()];
		const added = await repository.addQuestion({
			ownerId: owner,
			createdBy: "user",
			question: "Refunds?",
			expectedDocumentIds: expected,
		});
		expect(await repository.listQuestions(owner)).toEqual([added]);
		expect(added.expectedDocumentIds).toEqual(expected);
		expect(await repository.countQuestions(owner)).toBe(1);
		expect(await repository.listQuestions(other)).toEqual([]);
		expect(await repository.removeQuestion(other, added.id)).toBe(false);
		expect(await repository.removeQuestion(owner, added.id)).toBe(true);
		expect(await repository.countQuestions(owner)).toBe(0);
	});

	test("runs store their results as written and list newest first without cases", async () => {
		const results = {
			modes: {
				hybrid: { recallAtK: 1, mrr: 1 },
				vector: { recallAtK: 0.5, mrr: 0.25 },
				keyword: { recallAtK: 0, mrr: 0 },
			},
			cases: [
				{
					questionId: crypto.randomUUID(),
					question: "Refunds?",
					expectedDocumentIds: [crypto.randomUUID()],
					ranks: { hybrid: 1, vector: 4, keyword: null },
				},
			],
		};
		const base = {
			ownerId: owner,
			createdBy: "user",
			k: 5,
			questionCount: 1,
			embeddingModel: "mock:embed",
			chunkerVersion: "text-v1",
			results,
		};
		const first = await repository.saveRun(base);
		const second = await repository.saveRun({ ...base, k: 3 });

		const runs = await repository.listRuns(owner, 10);
		expect(runs.map((run) => run.id)).toEqual([second.id, first.id]);
		expect(runs[0]).not.toHaveProperty("cases");
		expect((await repository.findRun(owner, first.id))?.cases).toEqual(results.cases);
		expect((await repository.findRun(owner, first.id))?.modes).toEqual(results.modes);
		expect(await repository.findRun(other, first.id)).toBeNull();
	});
});
