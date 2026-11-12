import { Alert, AlertDescription, AlertTitle } from "@synapse/ui/components/alert";
import Link from "next/link";

import { MODES } from "../constants/retrieval.constants";
import type { Match, ModeResult, SearchMode } from "../types/retrieval.types";
import { crossRanks } from "../utils/cross-ranks";

const LABEL = Object.fromEntries(MODES.map(({ mode, label }) => [mode, label])) as Record<
	SearchMode,
	string
>;

/** What `score` means in each mode (scores are never comparable across modes). */
function scoreLabel(mode: SearchMode, match: Match): string {
	if (match.ranks?.rerank !== undefined) return "Reranker score";
	if (mode === "hybrid") return "Fused (RRF) score";
	return mode === "vector" ? "Cosine similarity" : "Keyword score";
}

/** Every mode's passages side by side, each saying where else it ranked. */
export function ModeResults({ results }: { results: ModeResult[] }) {
	const ranks = crossRanks(results);
	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-muted-foreground">
				Scores mean different things in each column, so compare ranks, not numbers.
			</p>
			<div className="grid gap-6 lg:grid-cols-3">
				{results.map((result) => {
					const { label, description } = MODES.find((m) => m.mode === result.mode) ?? MODES[0];
					const headingId = `mode-${result.mode}`;
					return (
						<section
							key={result.mode}
							aria-labelledby={headingId}
							className="flex min-w-0 flex-col gap-3"
						>
							<div>
								<h2 id={headingId} className="text-sm font-medium">
									{label}
								</h2>
								<p className="text-xs text-muted-foreground">{description}</p>
							</div>
							{result.status === "failed" ? (
								<Alert variant="destructive">
									<AlertTitle>{label} search failed</AlertTitle>
									<AlertDescription>{result.message}</AlertDescription>
								</Alert>
							) : result.matches.length === 0 ? (
								<p className="text-xs text-muted-foreground">No passages matched.</p>
							) : (
								<ol className="flex flex-col gap-3">
									{result.matches.map((match, index) => {
										const elsewhere = Object.entries(ranks.get(match.chunkId) ?? {}).filter(
											([mode]) => mode !== result.mode,
										) as [SearchMode, number][];
										return (
											<li
												key={match.chunkId}
												className="flex flex-col gap-1.5 rounded-lg border p-3"
											>
												<p className="flex min-w-0 items-baseline gap-2 text-sm">
													<span className="text-xs font-medium text-muted-foreground tabular-nums">
														#{index + 1}
													</span>
													<Link
														href={`/documents/${encodeURIComponent(match.documentId)}`}
														className="min-w-0 truncate font-medium underline-offset-2 hover:underline"
													>
														{match.documentTitle}
													</Link>
													<span className="shrink-0 text-xs text-muted-foreground">
														chunk {match.chunkIndex + 1}
													</span>
												</p>
												<p className="line-clamp-4 text-sm leading-relaxed text-pretty break-words">
													{match.content}
												</p>
												<p className="text-xs text-muted-foreground">
													{scoreLabel(result.mode, match)}{" "}
													<span className="tabular-nums">{match.score.toFixed(4)}</span>
													{" · "}
													{elsewhere.length === 0
														? `only in ${label}`
														: `also ${elsewhere.map(([mode, rank]) => `#${rank} in ${LABEL[mode]}`).join(", ")}`}
												</p>
											</li>
										);
									})}
								</ol>
							)}
						</section>
					);
				})}
			</div>
		</div>
	);
}
