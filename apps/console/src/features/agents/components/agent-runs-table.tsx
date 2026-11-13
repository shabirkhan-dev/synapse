import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import type { AgentRun } from "../types/agents.types";

const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const count = new Intl.NumberFormat("en");

const AGENT_LABELS: Record<AgentRun["agent"], string> = { chat: "Chat", answer: "Cited answer" };

function whatItDid(run: AgentRun): string {
	if (run.agent === "answer") {
		return run.citations === 1 ? "Cited 1 passage" : `Cited ${run.citations ?? 0} passages`;
	}
	return run.tools.length === 0 ? "Replied without tools" : `Used ${run.tools.join(", ")}`;
}

export type AgentRunsTableProps = { runs: AgentRun[]; currentUserId: string | null };

/** The latest runs, newest first: who asked, what the assistant did and what it cost in tokens. */
export function AgentRunsTable({ runs, currentUserId }: AgentRunsTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>When</TableHead>
					<TableHead>Agent</TableHead>
					<TableHead>Who</TableHead>
					<TableHead>Question</TableHead>
					<TableHead>What it did</TableHead>
					<TableHead>Prompt</TableHead>
					<TableHead className="text-right">Tokens in / out</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{runs.map((run) => (
					<TableRow key={run.id}>
						<TableCell className="whitespace-nowrap text-muted-foreground">
							<time dateTime={run.createdAt}>{when.format(new Date(run.createdAt))}</time>
						</TableCell>
						<TableCell>{AGENT_LABELS[run.agent]}</TableCell>
						<TableCell>{run.actorId === currentUserId ? "You" : "A member"}</TableCell>
						<TableCell className="max-w-64 truncate">
							{run.question ?? <span className="text-muted-foreground">In a conversation</span>}
						</TableCell>
						<TableCell>{whatItDid(run)}</TableCell>
						<TableCell className="font-mono text-xs">{run.promptVersion ?? "—"}</TableCell>
						<TableCell className="text-right tabular-nums">
							{run.inputTokens === null ? "—" : count.format(run.inputTokens)} /{" "}
							{run.outputTokens === null ? "—" : count.format(run.outputTokens)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
