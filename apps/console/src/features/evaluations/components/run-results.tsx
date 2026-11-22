import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import { TickMeter } from "@/components/shared/tick-meter";

import { EVAL_MODES } from "../constants/evaluations.constants";
import type { EvalRun } from "../types/evaluation.types";
import { formatMrr, formatRecall, formatScore, formatWhen } from "../utils/format";

/** One run: the score of each mode, then where each question's document ranked. */
export function RunResults({ run }: { run: EvalRun }) {
	return (
		<div className="flex flex-col gap-6">
			<p className="font-mono text-xs text-muted-foreground">
				{formatWhen(run.createdAt)} · {run.questionCount}{" "}
				{run.questionCount === 1 ? "question" : "questions"} · top {run.k} ·{" "}
				<span className="font-mono">{run.embeddingModel}</span> ·{" "}
				<span className="font-mono">{run.chunkerVersion}</span>
			</p>
			{run.answers ? (
				<section aria-labelledby="answer-quality" className="flex flex-col gap-2">
					<h3 id="answer-quality" className="text-sm font-medium">
						Answer quality
					</h3>
					<dl className="grid gap-3 sm:grid-cols-2">
						{[
							{ label: "Faithful to the passages", value: run.answers.faithfulness },
							{ label: "Answers the question", value: run.answers.relevance },
						].map((score) => (
							<div
								key={score.label}
								className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-card"
							>
								<dt className="text-sm text-muted-foreground">{score.label}</dt>
								<dd className="font-mono text-2xl leading-none font-medium tabular-nums">
									{formatScore(score.value)}
								</dd>
								{score.value === null ? null : <TickMeter value={score.value} className="mt-1" />}
							</div>
						))}
					</dl>
					<p className="text-xs text-muted-foreground">
						{run.answers.judged} of {run.questionCount} answers judged by{" "}
						<span className="font-mono">
							{run.answers.judge.provider}:{run.answers.judge.model}
						</span>{" "}
						with <span className="font-mono">{run.answers.judge.version}</span>. A model's grades,
						averaged: a guide for comparing runs, not a verdict.
					</p>
				</section>
			) : null}
			<Table>
				<TableCaption className="sr-only">Score per search mode</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>Mode</TableHead>
						<TableHead className="text-right">Found in top {run.k}</TableHead>
						<TableHead className="text-right">MRR</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="tabular-nums">
					{EVAL_MODES.map(({ mode, label }) => (
						<TableRow key={mode}>
							<TableCell>{label}</TableCell>
							<TableCell className="text-right">
								<span className="inline-flex items-center gap-3">
									<TickMeter
										value={run.modes[mode].recallAtK}
										ticks={16}
										className="hidden h-4 sm:flex"
									/>
									{formatRecall(run.modes[mode].recallAtK)}
								</span>
							</TableCell>
							<TableCell className="text-right">{formatMrr(run.modes[mode].mrr)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Table>
				<TableCaption className="sr-only">
					Rank of the first expected document for each question
				</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>Question</TableHead>
						{EVAL_MODES.map(({ mode, label }) => (
							<TableHead key={mode} className="text-right">
								{label}
							</TableHead>
						))}
						{run.answers ? (
							<>
								<TableHead className="text-right">Faithful</TableHead>
								<TableHead className="text-right">Relevant</TableHead>
							</>
						) : null}
					</TableRow>
				</TableHeader>
				<TableBody className="tabular-nums">
					{run.cases.map((item) => (
						<TableRow key={item.questionId}>
							<TableCell className="whitespace-normal">
								{item.question}
								{item.answer?.reason ? (
									<span className="mt-1 block text-xs text-muted-foreground">
										{item.answer.reason}
									</span>
								) : null}
							</TableCell>
							{EVAL_MODES.map(({ mode }) => {
								const rank = item.ranks[mode];
								return (
									<TableCell
										key={mode}
										className={`text-right ${rank === null || rank > run.k ? "text-muted-foreground" : ""}`}
									>
										{rank === null ? "Not found" : `#${rank}`}
									</TableCell>
								);
							})}
							{run.answers ? (
								<>
									<TableCell className="text-right">
										{formatScore(item.answer?.faithfulness ?? null)}
									</TableCell>
									<TableCell className="text-right">
										{formatScore(item.answer?.relevance ?? null)}
									</TableCell>
								</>
							) : null}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
