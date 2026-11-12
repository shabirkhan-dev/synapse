import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";
import Link from "next/link";

import type { DocumentSummary } from "../types/document.types";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function DocumentsTable({ documents }: { documents: DocumentSummary[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Title</TableHead>
					<TableHead>Source</TableHead>
					<TableHead className="text-right">Chunks</TableHead>
					<TableHead className="text-right">Added</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{documents.map((document) => (
					<TableRow key={document.id}>
						<TableCell className="font-medium">
							<Link
								href={`/documents/${encodeURIComponent(document.id)}`}
								className="underline-offset-2 hover:underline"
							>
								{document.title}
							</Link>
						</TableCell>
						<TableCell className="max-w-64 truncate text-muted-foreground">
							{document.source ?? "—"}
						</TableCell>
						<TableCell className="text-right tabular-nums">{document.chunkCount}</TableCell>
						<TableCell className="text-right text-muted-foreground">
							<time dateTime={document.createdAt}>
								{dateFormat.format(new Date(document.createdAt))}
							</time>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
