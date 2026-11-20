import { LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@synapse/ui/components/table";
import Link from "next/link";

import { documentRoute } from "../constants/documents.constants";
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
								href={documentRoute(document.id)}
								className="underline-offset-2 hover:underline"
							>
								{document.title}
							</Link>
							{document.access === "restricted" ? (
								<span
									className="ms-2 inline-flex translate-y-0.5 text-muted-foreground"
									title="Only some people in the team can see this"
								>
									<HugeiconsIcon icon={LockIcon} size={14} strokeWidth={1.75} aria-hidden="true" />
									<span className="sr-only">(restricted)</span>
								</span>
							) : null}
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
