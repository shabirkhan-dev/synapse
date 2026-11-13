import { and, count, desc, eq } from "drizzle-orm";

import { type Database, evalQuestions, evalRuns } from "@synapse/database";

import { toEvalQuestion, toEvalRun, toEvalRunSummary } from "../mappers/evaluations.mapper";
import type {
	EvalQuestion,
	EvalRun,
	EvalRunSummary,
	EvaluationRepository,
	NewEvalRun,
} from "../types/evaluations.types";

export class DrizzleEvaluationRepository implements EvaluationRepository {
	constructor(private readonly db: Database) {}

	async listQuestions(ownerId: string): Promise<EvalQuestion[]> {
		const rows = await this.db
			.select()
			.from(evalQuestions)
			.where(eq(evalQuestions.ownerId, ownerId))
			.orderBy(evalQuestions.createdAt);
		return rows.map(toEvalQuestion);
	}

	async countQuestions(ownerId: string): Promise<number> {
		const [row] = await this.db
			.select({ total: count() })
			.from(evalQuestions)
			.where(eq(evalQuestions.ownerId, ownerId));
		return row?.total ?? 0;
	}

	async addQuestion(input: {
		ownerId: string;
		createdBy: string;
		question: string;
		expectedDocumentIds: string[];
	}): Promise<EvalQuestion> {
		const [row] = await this.db.insert(evalQuestions).values(input).returning();
		if (!row) throw new Error("Evaluation question was not inserted");
		return toEvalQuestion(row);
	}

	async removeQuestion(ownerId: string, id: string): Promise<boolean> {
		const rows = await this.db
			.delete(evalQuestions)
			.where(and(eq(evalQuestions.id, id), eq(evalQuestions.ownerId, ownerId)))
			.returning({ id: evalQuestions.id });
		return rows.length > 0;
	}

	async saveRun(run: NewEvalRun): Promise<EvalRun> {
		const [row] = await this.db.insert(evalRuns).values(run).returning();
		if (!row) throw new Error("Evaluation run was not inserted");
		return toEvalRun(row);
	}

	async listRuns(ownerId: string, limit: number): Promise<EvalRunSummary[]> {
		const rows = await this.db
			.select({
				id: evalRuns.id,
				k: evalRuns.k,
				questionCount: evalRuns.questionCount,
				embeddingModel: evalRuns.embeddingModel,
				chunkerVersion: evalRuns.chunkerVersion,
				results: evalRuns.results,
				createdAt: evalRuns.createdAt,
			})
			.from(evalRuns)
			.where(eq(evalRuns.ownerId, ownerId))
			.orderBy(desc(evalRuns.createdAt))
			.limit(limit);
		return rows.map(toEvalRunSummary);
	}

	async findRun(ownerId: string, id: string): Promise<EvalRun | null> {
		const [row] = await this.db
			.select()
			.from(evalRuns)
			.where(and(eq(evalRuns.id, id), eq(evalRuns.ownerId, ownerId)))
			.limit(1);
		return row ? toEvalRun(row) : null;
	}
}
