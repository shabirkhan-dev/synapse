import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@synapse/ui/components/badge";

import type { DocumentChunk, DocumentDetail } from "../types/document.types";

export type ChunkListProps = {
	chunks: DocumentChunk[];
	current: DocumentDetail["current"];
};

/** What is off about a chunk's versions, in words; nothing when it matches today's. */
function notes(chunk: DocumentChunk, current: DocumentDetail["current"]): string[] {
	const found: string[] = [];
	if (chunk.embeddingModel === null) {
		found.push("Stored before versions were recorded");
	} else if (chunk.embeddingModel !== current.embeddingModel) {
		found.push(
			`Embedded with ${chunk.embeddingModel}: search by meaning skips it until it is re-embedded (keyword search still finds it)`,
		);
	}
	if (chunk.chunkerVersion !== null && chunk.chunkerVersion !== current.chunkerVersion) {
		found.push(`Split by an older chunker (${chunk.chunkerVersion})`);
	}
	return found;
}

/** The document's chunks in order: what search and answers actually read. */
export function ChunkList({ chunks, current }: ChunkListProps) {
	return (
		<ol aria-label="Chunks" className="flex flex-col divide-y">
			{chunks.map((chunk) => {
				const issues = notes(chunk, current);
				return (
					<li key={chunk.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground tabular-nums">
								Chunk {chunk.chunkIndex + 1}
							</span>
							{issues.length > 0 ? (
								<Badge variant="secondary">
									<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden="true" />
									Out of date
								</Badge>
							) : null}
						</div>
						{issues.map((issue) => (
							<p key={issue} className="text-xs text-muted-foreground text-pretty">
								{issue}
							</p>
						))}
						<p className="max-w-prose text-sm leading-relaxed text-pretty break-words whitespace-pre-wrap">
							{chunk.content}
						</p>
					</li>
				);
			})}
		</ol>
	);
}
