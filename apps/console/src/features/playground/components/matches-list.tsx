import Link from "next/link";

import type { RagMatch } from "../types/playground.types";
import { SourceLink } from "./source-link";

const RANK_LABELS = { vector: "Meaning", keyword: "Keywords", rerank: "Reranker" } as const;

/** The retrieved passages, best first, with the rank each search gave them. */
export function MatchesList({ matches }: { matches: RagMatch[] }) {
	if (matches.length === 0) {
		return <p className="text-xs text-muted-foreground">No passages matched.</p>;
	}
	return (
		<ol aria-label="Retrieved passages" className="flex flex-col gap-3">
			{matches.map((match, position) => (
				<li key={match.chunkId} className="flex flex-col gap-1.5 rounded-lg border p-3">
					<p className="flex min-w-0 items-baseline gap-2 text-sm">
						<span className="text-xs font-medium text-muted-foreground tabular-nums">
							#{position + 1}
						</span>
						<Link
							href={`/documents/${encodeURIComponent(match.documentId)}`}
							className="min-w-0 font-medium break-words underline-offset-2 hover:underline"
						>
							{match.context || match.documentTitle}
						</Link>
						<span className="shrink-0 text-xs text-muted-foreground">
							chunk {match.chunkIndex + 1}
						</span>
					</p>
					<p className="line-clamp-4 text-sm leading-relaxed text-pretty break-words whitespace-pre-wrap">
						{match.content}
					</p>
					<p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
						{(Object.keys(RANK_LABELS) as Array<keyof typeof RANK_LABELS>).map((key) =>
							match.ranks?.[key] === undefined ? null : (
								<span key={key}>
									{RANK_LABELS[key]} #{match.ranks[key]}
								</span>
							),
						)}
						<span title="Not comparable across search modes">score {match.score.toFixed(4)}</span>
						<SourceLink source={match.source} />
					</p>
				</li>
			))}
		</ol>
	);
}
