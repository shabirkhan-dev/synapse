import { Button } from "@synapse/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";

import type { EvalQuestion } from "../types/evaluation.types";

export type QuestionsTableProps = {
	questions: EvalQuestion[];
	/** Document titles by id; a missing id was deleted since. */
	titles: ReadonlyMap<string, string>;
	onDelete: (id: string) => void;
	deletingId: string | null;
};

/** Each question with the documents it expects; deleting one keeps past runs as they were. */
export function QuestionsTable({ questions, titles, onDelete, deletingId }: QuestionsTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Question</TableHead>
					<TableHead>Expected documents</TableHead>
					<TableHead>
						<span className="sr-only">Actions</span>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{questions.map((item) => (
					<TableRow key={item.id}>
						<TableCell className="whitespace-normal">{item.question}</TableCell>
						<TableCell className="whitespace-normal">
							{item.expectedDocumentIds
								.map((id) => titles.get(id) ?? "Deleted document")
								.join(", ")}
						</TableCell>
						<TableCell className="text-right">
							<Button
								size="sm"
								variant="ghost"
								disabled={deletingId === item.id}
								onClick={() => onDelete(item.id)}
								aria-label={`Delete question “${item.question}”`}
							>
								Delete
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
