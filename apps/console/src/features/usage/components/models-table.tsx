import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import type { UsageModel } from "../types/usage.types";
import { formatCount, formatUsd } from "../utils/format";

const SOURCE_LABELS: Record<UsageModel["source"], string> = { rag: "Playground", chat: "Chat" };

/** Answers by where they came from and the chat model, prompt and embedding model behind them. */
export function ModelsTable({ models }: { models: UsageModel[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Source</TableHead>
					<TableHead>Chat model</TableHead>
					<TableHead>Prompt</TableHead>
					<TableHead>Embedding model</TableHead>
					<TableHead className="text-right">Answers</TableHead>
					<TableHead className="text-right">Input tokens</TableHead>
					<TableHead className="text-right">Output tokens</TableHead>
					<TableHead className="text-right">Est. cost</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="tabular-nums">
				{models.map((model) => (
					<TableRow
						key={`${model.source} ${model.chatModel} ${model.promptVersion} ${model.embeddingModel}`}
					>
						<TableCell>{SOURCE_LABELS[model.source]}</TableCell>
						<TableCell className="font-mono text-xs">{model.chatModel}</TableCell>
						<TableCell className="font-mono text-xs">{model.promptVersion}</TableCell>
						<TableCell className="font-mono text-xs">{model.embeddingModel}</TableCell>
						<TableCell className="text-right">{formatCount(model.answers)}</TableCell>
						<TableCell className="text-right">{formatCount(model.inputTokens)}</TableCell>
						<TableCell className="text-right">{formatCount(model.outputTokens)}</TableCell>
						<TableCell className="text-right">
							{model.costUsd === null ? (
								<span className="text-muted-foreground">No price</span>
							) : (
								formatUsd(model.costUsd)
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
