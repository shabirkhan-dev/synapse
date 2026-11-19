"use client";

import { Button } from "@synapse/ui/components/button";
import { Checkbox } from "@synapse/ui/components/checkbox";
import { Label } from "@synapse/ui/components/label";

export type DocumentScopeProps = {
	documents: { id: string; title: string }[];
	/** Ids of the chosen documents; empty = every document. */
	selected: string[];
	onChange: (selected: string[]) => void;
	/** Most documents one question may search (the API allows 20). */
	max?: number;
};

/** Narrow a question to chosen documents; with none chosen, every document is searched. */
export function DocumentScope({ documents, selected, onChange, max = 20 }: DocumentScopeProps) {
	const full = selected.length >= max;
	const chosen = documents.filter((document) => selected.includes(document.id));
	const summary =
		chosen.length === 0
			? "All documents"
			: chosen.length === 1
				? (chosen[0]?.title ?? "1 document")
				: `${chosen.length} documents`;

	return (
		<details className="group rounded-lg border" open={selected.length > 0 ? true : undefined}>
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm select-none [&::-webkit-details-marker]:hidden">
				<span className="flex min-w-0 items-baseline gap-2">
					<span className="shrink-0 text-muted-foreground">Search in</span>
					<span className="truncate font-medium">{summary}</span>
				</span>
				<span className="shrink-0 text-xs text-muted-foreground group-open:hidden">Change</span>
				<span className="hidden shrink-0 text-xs text-muted-foreground group-open:inline">
					Close
				</span>
			</summary>
			<fieldset className="flex flex-col gap-2 border-t px-3 py-3">
				<legend className="sr-only">Documents to search</legend>
				{documents.length === 0 ? (
					<p className="text-xs text-muted-foreground">No documents yet.</p>
				) : (
					<ul className="flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain">
						{documents.map((document) => {
							const checked = selected.includes(document.id);
							return (
								<li key={document.id}>
									<Label className="flex items-center gap-2 font-normal">
										<Checkbox
											checked={checked}
											disabled={full && !checked}
											onCheckedChange={(next) =>
												onChange(
													next
														? [...selected, document.id]
														: selected.filter((id) => id !== document.id),
												)
											}
										/>
										<span className="min-w-0 break-words">{document.title}</span>
									</Label>
								</li>
							);
						})}
					</ul>
				)}
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-xs text-muted-foreground">
						{full
							? `At most ${max} documents per question.`
							: "Choose none to search every document."}
					</p>
					{selected.length > 0 ? (
						<Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
							Search all documents
						</Button>
					) : null}
				</div>
			</fieldset>
		</details>
	);
}
