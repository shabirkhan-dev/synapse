"use client";

import { Files01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@synapse/ui/components/button";
import { Checkbox } from "@synapse/ui/components/checkbox";
import { Label } from "@synapse/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@synapse/ui/components/popover";
import { cn } from "@synapse/ui/lib/utils";

export type DocumentScopeProps = {
	documents: { id: string; title: string }[];
	/** Ids of the chosen documents; empty = every document. */
	selected: string[];
	onChange: (selected: string[]) => void;
	/** Most documents one question may search (the API allows 20). */
	max?: number;
};

const summaryOf = (documents: DocumentScopeProps["documents"], selected: string[]) => {
	const chosen = documents.filter((document) => selected.includes(document.id));
	return chosen.length === 0
		? "All documents"
		: chosen.length === 1
			? (chosen[0]?.title ?? "1 document")
			: `${chosen.length} documents`;
};

/** Narrow a question to chosen documents; with none chosen, every document is searched. */
export function DocumentScope({ documents, selected, onChange, max = 20 }: DocumentScopeProps) {
	return (
		<details className="group rounded-lg border" open={selected.length > 0 ? true : undefined}>
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm select-none [&::-webkit-details-marker]:hidden">
				<span className="flex min-w-0 items-baseline gap-2">
					<span className="shrink-0 text-muted-foreground">Search in</span>
					<span className="truncate font-medium">{summaryOf(documents, selected)}</span>
				</span>
				<span className="shrink-0 text-xs text-muted-foreground group-open:hidden">Change</span>
				<span className="hidden shrink-0 text-xs text-muted-foreground group-open:inline">
					Close
				</span>
			</summary>
			<div className="border-t px-3 py-3">
				<DocumentScopeOptions
					documents={documents}
					selected={selected}
					onChange={onChange}
					max={max}
				/>
			</div>
		</details>
	);
}

/**
 * The same choice as a compact chip that opens a popover (the chat composer's toolbar). Its name
 * starts with what it shows: "All documents, search in".
 */
export function DocumentScopeMenu({ documents, selected, onChange, max = 20 }: DocumentScopeProps) {
	const summary = summaryOf(documents, selected);
	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant={selected.length > 0 ? "secondary" : "ghost"}
						size="sm"
						className={cn(
							"max-w-56 gap-1.5 aria-expanded:text-foreground",
							selected.length > 0 ? "text-foreground" : "text-muted-foreground",
						)}
					/>
				}
			>
				<HugeiconsIcon icon={Files01Icon} strokeWidth={1.75} aria-hidden="true" />
				<span className="truncate">{summary}</span>
				<span className="sr-only">, documents to search in</span>
			</PopoverTrigger>
			<PopoverContent side="top" align="start" className="w-80">
				<DocumentScopeOptions
					documents={documents}
					selected={selected}
					onChange={onChange}
					max={max}
				/>
			</PopoverContent>
		</Popover>
	);
}

/** The checkbox list both pickers share. */
function DocumentScopeOptions({ documents, selected, onChange, max = 20 }: DocumentScopeProps) {
	const full = selected.length >= max;
	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-2 font-mono text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
				Documents to search
			</legend>
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
	);
}
