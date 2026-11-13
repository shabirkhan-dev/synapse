import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import { EVAL_MODES } from "../constants/evaluations.constants";
import type { EvalRun } from "../types/evaluation.types";
import { formatMrr, formatRecall, formatWhen } from "../utils/format";

/** One run: the score of each mode, then where each question's document ranked. */
export function RunResults({ run }: { run: EvalRun }) {
	return (
		<div className="flex flex-col gap-6">
			<p className="text-xs text-muted-foreground">
				{formatWhen(run.createdAt)} · {run.questionCount}{" "}
				{run.questionCount === 1 ? "question" : "questions"} · top {run.k} ·{" "}
				<span className="font-mono">{run.embeddingModel}</span> ·{" "}
				<span className="font-mono">{run.chunkerVersion}</span>
			</p>
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
								{formatRecall(run.modes[mode].recallAtK)}
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
					</TableRow>
				</TableHeader>
				<TableBody className="tabular-nums">
					{run.cases.map((item) => (
						<TableRow key={item.questionId}>
							<TableCell className="whitespace-normal">{item.question}</TableCell>
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
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
