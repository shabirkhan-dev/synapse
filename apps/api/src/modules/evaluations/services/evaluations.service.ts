import { AUDIT_ACTIONS, type AuditLog } from "@synapse/audit";
import type { ChatGateway } from "@synapse/core/contracts";
import type {
	EvalAnswerSummary,
	EvalCaseAnswer,
	EvalRunResults,
	EvalSearchMode,
} from "@synapse/database";
import {
	ANSWER_JUDGE_VERSION,
	evaluateRetrieval,
	judgeAnswer,
	mean,
	type RetrievalReport,
} from "@synapse/evaluation";

import type { RagService } from "@/modules/rag";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { RequestContext } from "@/shared/types/app-types";

import {
	EVAL_ANSWER_CONCURRENCY,
	EVAL_CHUNKS_PER_RESULT,
	EVAL_ERROR_CODES,
	EVAL_MAX_CHUNKS,
	EVAL_MAX_QUESTIONS,
	EVAL_MESSAGES,
	EVAL_RUN_LIST_LIMIT,
} from "../constants/evaluations.constants";
import type {
	EvalQuestion,
	EvalRun,
	EvalRunSummary,
	EvaluationRepository,
} from "../types/evaluations.types";

/** Who acts, for whom (the active organization) and under which request. */
type Scope = { ownerId: string; actorId: string; context: RequestContext };

/**
 * A team's own retrieval evaluation: questions with the documents that should answer them, run
 * through every search mode with `@synapse/evaluation` (recall@k, MRR) on the real index.
 */
export class EvaluationsService {
	constructor(
		private readonly repository: EvaluationRepository,
		private readonly rag: Pick<RagService, "search" | "hasDocument" | "versions" | "answer">,
		private readonly audit: AuditLog,
		/** Grades answers when a run asks for it (the chat model, through the gateway). */
		private readonly judge: ChatGateway,
	) {}

	listQuestions(ownerId: string): Promise<EvalQuestion[]> {
		return this.repository.listQuestions(ownerId);
	}

	async addQuestion(
		{ ownerId, actorId }: Scope,
		input: { question: string; expectedDocumentIds: string[] },
	): Promise<EvalQuestion> {
		if ((await this.repository.countQuestions(ownerId)) >= EVAL_MAX_QUESTIONS) {
			throw new AppError({
				statusCode: HTTP_STATUS.CONFLICT,
				code: EVAL_ERROR_CODES.TOO_MANY_QUESTIONS,
				message: EVAL_MESSAGES.TOO_MANY_QUESTIONS(EVAL_MAX_QUESTIONS),
			});
		}
		const ids = [...new Set(input.expectedDocumentIds)];
		const found = await Promise.all(ids.map((id) => this.rag.hasDocument(ownerId, id)));
		const unknown = ids.filter((_, index) => !found[index]);
		if (unknown.length > 0) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				code: EVAL_ERROR_CODES.UNKNOWN_DOCUMENTS,
				message: EVAL_MESSAGES.UNKNOWN_DOCUMENTS,
				details: unknown,
			});
		}
		return this.repository.addQuestion({
			ownerId,
			createdBy: actorId,
			question: input.question,
			expectedDocumentIds: ids,
		});
	}

	async removeQuestion(ownerId: string, id: string): Promise<void> {
		if (!(await this.repository.removeQuestion(ownerId, id))) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: EVAL_ERROR_CODES.QUESTION_NOT_FOUND,
				message: EVAL_MESSAGES.QUESTION_NOT_FOUND,
			});
		}
	}

	/**
	 * Every question through each mode; with `judgeAnswers`, each is also answered (hybrid, top k)
	 * and the answer judged. Stored with the embedding model and chunker it ran on.
	 */
	async run(
		{ ownerId, actorId, context }: Scope,
		k: number,
		judgeAnswers = false,
	): Promise<EvalRun> {
		const questions = await this.repository.listQuestions(ownerId);
		if (questions.length === 0) {
			throw new AppError({
				statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
				code: EVAL_ERROR_CODES.NO_QUESTIONS,
				message: EVAL_MESSAGES.NO_QUESTIONS,
			});
		}
		const dataset = {
			name: "workspace",
			version: 1,
			// Only the cases are used: the documents are already in the organization's index.
			documents: [],
			cases: questions.map((item) => ({
				id: item.id,
				query: item.question,
				relevant: item.expectedDocumentIds,
			})),
		};
		const topK = Math.min(EVAL_MAX_CHUNKS, k * EVAL_CHUNKS_PER_RESULT);
		const evaluate = (mode: EvalSearchMode) =>
			evaluateRetrieval({
				dataset,
				k,
				setup: { mode },
				search: async (query) =>
					(await this.rag.search(ownerId, query, topK, mode)).map((match) => match.documentId),
			});
		const [hybrid, vector, keyword] = await Promise.all([
			evaluate("hybrid"),
			evaluate("vector"),
			evaluate("keyword"),
		]);
		const answers = judgeAnswers
			? await this.answerAll(
					{ ownerId, actorId, context },
					questions.map((item) => item.question),
					k,
				)
			: null;
		const reports: Record<EvalSearchMode, RetrievalReport> = { hybrid, vector, keyword };
		const rankOf = (mode: EvalSearchMode, caseIndex: number, expected: string[]) => {
			const retrieved = reports[mode].cases[caseIndex]?.retrieved ?? [];
			const rank = retrieved.findIndex((id) => expected.includes(id));
			return rank === -1 ? null : rank + 1;
		};
		const results: EvalRunResults = {
			modes: {
				hybrid: reports.hybrid.metrics,
				vector: reports.vector.metrics,
				keyword: reports.keyword.metrics,
			},
			cases: questions.map((item, caseIndex) => ({
				questionId: item.id,
				question: item.question,
				expectedDocumentIds: item.expectedDocumentIds,
				ranks: {
					hybrid: rankOf("hybrid", caseIndex, item.expectedDocumentIds),
					vector: rankOf("vector", caseIndex, item.expectedDocumentIds),
					keyword: rankOf("keyword", caseIndex, item.expectedDocumentIds),
				},
				...(answers ? { answer: answers[caseIndex] } : {}),
			})),
			...(answers ? { answers: this.summarize(answers) } : {}),
		};
		const { embeddingModel, chunkerVersion } = this.rag.versions;
		const run = await this.repository.saveRun({
			ownerId,
			createdBy: actorId,
			k,
			questionCount: questions.length,
			embeddingModel,
			chunkerVersion,
			results,
		});
		await this.audit.record({
			ownerId,
			actorId,
			action: AUDIT_ACTIONS.EVALUATION_RUN_COMPLETED,
			subjectType: "evaluation_run",
			subjectId: run.id,
			requestId: context.requestId,
			data: {
				k,
				questionCount: questions.length,
				embeddingModel,
				chunkerVersion,
				modes: results.modes,
				...(results.answers ? { answers: results.answers } : {}),
			},
			provenance: null,
		});
		return run;
	}

	/** Answer and judge every question, a few at a time; a failure leaves that one unjudged. */
	private async answerAll(scope: Scope, questions: string[], k: number): Promise<EvalCaseAnswer[]> {
		const results: EvalCaseAnswer[] = [];
		for (let start = 0; start < questions.length; start += EVAL_ANSWER_CONCURRENCY) {
			const batch = questions.slice(start, start + EVAL_ANSWER_CONCURRENCY);
			// oxlint-disable-next-line no-await-in-loop -- batches bound the parallel model calls
			results.push(
				...(await Promise.all(batch.map((question) => this.answerOne(scope, question, k)))),
			);
		}
		return results;
	}

	private async answerOne(
		{ ownerId, context }: Scope,
		question: string,
		k: number,
	): Promise<EvalCaseAnswer> {
		const unjudged = (text: string, reason: string | null) => ({
			text,
			faithfulness: null,
			relevance: null,
			reason,
		});
		let answer: Awaited<ReturnType<RagService["answer"]>>;
		try {
			answer = await this.rag.answer(ownerId, question, k, context);
		} catch {
			return unjudged("", EVAL_MESSAGES.ANSWER_FAILED);
		}
		// Nothing to answer from: there is no answer to grade.
		if (answer.provenance === null) return unjudged(answer.answer, null);
		try {
			const judgement = await judgeAnswer({
				chat: this.judge,
				question,
				answer: answer.answer,
				passages: answer.matches.map((match, position) => ({
					index: position + 1,
					title: match.documentTitle,
					content: match.content,
				})),
			});
			return {
				text: answer.answer,
				faithfulness: judgement.faithfulness,
				relevance: judgement.relevance,
				reason: judgement.reason || null,
			};
		} catch {
			return unjudged(answer.answer, EVAL_MESSAGES.JUDGE_FAILED);
		}
	}

	private summarize(answers: EvalCaseAnswer[]): EvalAnswerSummary {
		const judged = answers.filter(
			(answer): answer is EvalCaseAnswer & { faithfulness: number; relevance: number } =>
				answer.faithfulness !== null && answer.relevance !== null,
		);
		return {
			judge: { ...this.judge.info, version: ANSWER_JUDGE_VERSION },
			faithfulness: judged.length ? mean(judged.map((answer) => answer.faithfulness)) : null,
			relevance: judged.length ? mean(judged.map((answer) => answer.relevance)) : null,
			judged: judged.length,
		};
	}

	listRuns(ownerId: string): Promise<EvalRunSummary[]> {
		return this.repository.listRuns(ownerId, EVAL_RUN_LIST_LIMIT);
	}

	async getRun(ownerId: string, id: string): Promise<EvalRun> {
		const run = await this.repository.findRun(ownerId, id);
		if (!run) {
			throw new AppError({
				statusCode: HTTP_STATUS.NOT_FOUND,
				code: EVAL_ERROR_CODES.RUN_NOT_FOUND,
				message: EVAL_MESSAGES.RUN_NOT_FOUND,
			});
		}
		return run;
	}
}
