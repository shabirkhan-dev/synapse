import { Button } from "@synapse/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import { EVAL_MODES } from "../constants/evaluations.constants";
import type { EvalRunSummary } from "../types/evaluation.types";
import { formatMrr, formatRecall, formatWhen } from "../utils/format";

export type RunsTableProps = {
	runs: EvalRunSummary[];
	selectedId: string | null;
	onSelect: (id: string) => void;
};

/** Past runs, newest first: how each mode's score moved as documents and models changed. */
export function RunsTable({ runs, selectedId, onSelect }: RunsTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Run</TableHead>
					<TableHead className="text-right">Top k</TableHead>
					{EVAL_MODES.map(({ mode, label }) => (
						<TableHead key={mode} className="text-right">
							{label}
						</TableHead>
					))}
					<TableHead>Embedding model</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="tabular-nums">
				{runs.map((run) => (
					<TableRow key={run.id} data-state={run.id === selectedId ? "selected" : undefined}>
						<TableCell>
							<Button
								variant="link"
								size="sm"
								className="h-auto p-0"
								aria-current={run.id === selectedId ? "true" : undefined}
								onClick={() => onSelect(run.id)}
							>
								{formatWhen(run.createdAt)}
							</Button>
						</TableCell>
						<TableCell className="text-right">{run.k}</TableCell>
						{EVAL_MODES.map(({ mode }) => (
							<TableCell key={mode} className="text-right">
								{formatRecall(run.modes[mode].recallAtK)}{" "}
								<span className="text-muted-foreground">· {formatMrr(run.modes[mode].mrr)}</span>
							</TableCell>
						))}
						<TableCell className="font-mono text-xs">{run.embeddingModel}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
