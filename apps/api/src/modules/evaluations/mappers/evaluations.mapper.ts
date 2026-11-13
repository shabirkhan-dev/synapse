import type { EvalQuestionRow, EvalRunRow } from "@synapse/database";

import type { EvalQuestion, EvalRun, EvalRunSummary } from "../types/evaluations.types";

export function toEvalQuestion(row: EvalQuestionRow): EvalQuestion {
	return {
		id: row.id,
		question: row.question,
		expectedDocumentIds: row.expectedDocumentIds,
		createdAt: row.createdAt.toISOString(),
	};
}

export function toEvalRunSummary(row: Omit<EvalRunRow, "ownerId" | "createdBy">): EvalRunSummary {
	return {
		id: row.id,
		k: row.k,
		questionCount: row.questionCount,
		embeddingModel: row.embeddingModel,
		chunkerVersion: row.chunkerVersion,
		modes: row.results.modes,
		createdAt: row.createdAt.toISOString(),
	};
}

export function toEvalRun(row: EvalRunRow): EvalRun {
	return { ...toEvalRunSummary(row), cases: row.results.cases };
}
