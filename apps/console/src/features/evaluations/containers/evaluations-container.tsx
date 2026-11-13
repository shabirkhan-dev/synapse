"use client";

import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import { Button } from "@synapse/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@synapse/ui/components/card";
import { useMemo, useState } from "react";

import { useDocumentsQuery } from "@/features/documents";

import { AddQuestionForm } from "../components/add-question-form";
import { QuestionsTable } from "../components/questions-table";
import { RunResults } from "../components/run-results";
import { RunsTable } from "../components/runs-table";
import { DEFAULT_K, EVAL_LIMITS, K_OPTIONS } from "../constants/evaluations.constants";
import { useAddEvalQuestionMutation } from "../hooks/mutations/use-add-eval-question-mutation";
import { useDeleteEvalQuestionMutation } from "../hooks/mutations/use-delete-eval-question-mutation";
import { useRunEvaluationMutation } from "../hooks/mutations/use-run-evaluation-mutation";
import { useEvalQuestionsQuery } from "../hooks/queries/use-eval-questions-query";
import { useEvalRunQuery } from "../hooks/queries/use-eval-run-query";
import { useEvalRunsQuery } from "../hooks/queries/use-eval-runs-query";

/** Questions with the documents that should answer them, scored per search mode, run by run. */
export function EvaluationsContainer() {
	const documents = useDocumentsQuery();
	const questions = useEvalQuestionsQuery();
	const runs = useEvalRunsQuery();
	const addQuestion = useAddEvalQuestionMutation();
	const deleteQuestion = useDeleteEvalQuestionMutation();
	const runEvaluation = useRunEvaluationMutation();
	const [k, setK] = useState<number>(DEFAULT_K);
	const [chosenRunId, setChosenRunId] = useState<string | null>(null);
	const selectedRunId = chosenRunId ?? runs.data?.[0]?.id ?? null;
	const run = useEvalRunQuery(selectedRunId);

	const titles = useMemo(
		() => new Map((documents.data ?? []).map((document) => [document.id, document.title])),
		[documents.data],
	);
	const questionCount = questions.data?.length ?? 0;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-lg font-semibold">Evaluations</h1>
				<p className="text-xs text-muted-foreground">
					Write the questions people ask and the documents that answer them, then see how often each
					search mode finds those documents.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Questions</CardTitle>
					<CardDescription>
						{questionCount} of {EVAL_LIMITS.QUESTIONS_MAX}. Shared with everyone in this workspace.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<AddQuestionForm
						documents={documents.data ?? []}
						pending={addQuestion.isPending}
						error={addQuestion.error ? addQuestion.error.message : null}
						onSubmit={(input) => addQuestion.mutateAsync(input)}
					/>
					{questions.isPending ? (
						<p role="status" className="text-xs text-muted-foreground">
							Loading questions…
						</p>
					) : questions.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Questions could not be loaded</AlertTitle>
							<AlertDescription className="flex flex-wrap items-center gap-2">
								{questions.error.message}
								<Button size="sm" variant="outline" onClick={() => questions.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : questionCount === 0 ? (
						<p className="text-xs text-muted-foreground">
							No questions yet. Add one above to start measuring search.
						</p>
					) : (
						<QuestionsTable
							questions={questions.data}
							titles={titles}
							deletingId={deleteQuestion.isPending ? (deleteQuestion.variables ?? null) : null}
							onDelete={(id) => deleteQuestion.mutate(id)}
						/>
					)}
					{deleteQuestion.isError ? (
						<Alert variant="destructive">
							<AlertDescription>{deleteQuestion.error.message}</AlertDescription>
						</Alert>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Runs</CardTitle>
					<CardDescription>
						Each run asks every question in all three modes. “Found in top k” is the share of
						expected documents among the first k results; MRR rewards finding them first.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<div className="flex flex-wrap items-center gap-3">
						<div role="group" aria-label="Top k" className="flex gap-1">
							{K_OPTIONS.map((option) => (
								<Button
									key={option}
									size="sm"
									variant={option === k ? "secondary" : "ghost"}
									aria-pressed={option === k}
									onClick={() => setK(option)}
								>
									Top {option}
								</Button>
							))}
						</div>
						<Button
							size="sm"
							disabled={questionCount === 0 || runEvaluation.isPending}
							onClick={() =>
								runEvaluation.mutate(k, { onSuccess: (finished) => setChosenRunId(finished.id) })
							}
						>
							{runEvaluation.isPending ? "Running…" : "Run evaluation"}
						</Button>
					</div>
					{runEvaluation.isError ? (
						<Alert variant="destructive">
							<AlertDescription>{runEvaluation.error.message}</AlertDescription>
						</Alert>
					) : null}
					{runs.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Runs could not be loaded</AlertTitle>
							<AlertDescription className="flex flex-wrap items-center gap-2">
								{runs.error.message}
								<Button size="sm" variant="outline" onClick={() => runs.refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : runs.data?.length === 0 ? (
						<p className="text-xs text-muted-foreground">No runs yet.</p>
					) : null}
					{run.data ? <RunResults run={run.data} /> : null}
					{run.isError ? (
						<Alert variant="destructive">
							<AlertDescription>{run.error.message}</AlertDescription>
						</Alert>
					) : null}
					{runs.data && runs.data.length > 1 ? (
						<div className="flex flex-col gap-2">
							<h2 className="text-sm font-medium">All runs</h2>
							<RunsTable runs={runs.data} selectedId={selectedRunId} onSelect={setChosenRunId} />
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
