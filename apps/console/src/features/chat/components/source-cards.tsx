import { File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { CitedPassage } from "@/components/shared/citation-popover";

type Source = { documentId: string; title: string; source: string | null; citations: number[] };

/** The documents a reply cited, once each, with the numbers that point at them. */
export function SourceCards({
	passages,
}: {
	passages: ReadonlyArray<CitedPassage & { documentId: string }>;
}) {
	const sources = new Map<string, Source>();
	for (const passage of passages) {
		const entry = sources.get(passage.documentId) ?? {
			documentId: passage.documentId,
			title: passage.title,
			source: passage.source,
			citations: [],
		};
		entry.citations.push(passage.citation);
		sources.set(passage.documentId, entry);
	}
	return (
		<ul aria-label="Sources" className="flex flex-wrap gap-2">
			{[...sources.values()].map((source) => (
				<li
					key={source.documentId}
					className="flex max-w-64 items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs"
				>
					<HugeiconsIcon
						icon={File01Icon}
						size={14}
						strokeWidth={1.75}
						className="shrink-0 text-link"
						aria-hidden="true"
					/>
					<span className="truncate font-medium" title={source.title}>
						{source.title}
					</span>
					<span className="shrink-0 text-muted-foreground tabular-nums">
						{source.citations.map((citation) => `[${citation}]`).join("")}
					</span>
				</li>
			))}
		</ul>
	);
}
