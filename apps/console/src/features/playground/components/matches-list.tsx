import type { RagMatch } from "../types/playground.types";
import { SourceLink } from "./source-link";

const RANK_LABELS = { vector: "vector", keyword: "keyword", rerank: "rerank" } as const;

/** The retrieved passages, best first, with the rank each search gave them. */
export function MatchesList({ matches }: { matches: RagMatch[] }) {
	if (matches.length === 0) {
		return <p className="text-xs text-muted-foreground">No passages matched.</p>;
	}
	return (
		<ol className="flex flex-col gap-3">
			{matches.map((match, position) => (
				<li key={match.chunkId} className="flex flex-col gap-1 rounded-md border p-3">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
						<span className="tabular-nums text-muted-foreground">#{position + 1}</span>
						<span className="font-medium">{match.documentTitle}</span>
						<span className="text-muted-foreground">chunk {match.chunkIndex + 1}</span>
						<SourceLink source={match.source} />
						<span className="ml-auto flex gap-2 text-muted-foreground tabular-nums">
							{(Object.keys(RANK_LABELS) as Array<keyof typeof RANK_LABELS>).map((key) =>
								match.ranks?.[key] === undefined ? null : (
									<span key={key}>
										{RANK_LABELS[key]} {match.ranks[key]}
									</span>
								),
							)}
							<span title="Not comparable across search modes">score {match.score.toFixed(4)}</span>
						</span>
					</div>
					<p className="line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
						{match.content}
					</p>
				</li>
			))}
		</ol>
	);
}
