import type { EvalRunResults } from "@synapse/database";

export type EvalQuestion = {
	id: string;
	question: string;
	expectedDocumentIds: string[];
	createdAt: string;
};

export type EvalRunSummary = {
	id: string;
	k: number;
	questionCount: number;
	embeddingModel: string;
	chunkerVersion: string;
	modes: EvalRunResults["modes"];
	createdAt: string;
};

export type EvalRun = EvalRunSummary & { cases: EvalRunResults["cases"] };

export type NewEvalRun = Omit<EvalRunSummary, "id" | "createdAt" | "modes"> & {
	ownerId: string;
	createdBy: string;
	results: EvalRunResults;
};

export interface EvaluationRepository {
	listQuestions(ownerId: string): Promise<EvalQuestion[]>;
	countQuestions(ownerId: string): Promise<number>;
	addQuestion(input: {
		ownerId: string;
		createdBy: string;
		question: string;
		expectedDocumentIds: string[];
	}): Promise<EvalQuestion>;
	removeQuestion(ownerId: string, id: string): Promise<boolean>;
	saveRun(run: NewEvalRun): Promise<EvalRun>;
	listRuns(ownerId: string, limit: number): Promise<EvalRunSummary[]>;
	findRun(ownerId: string, id: string): Promise<EvalRun | null>;
}
