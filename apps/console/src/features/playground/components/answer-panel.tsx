import type { ReactNode } from "react";

import { Disclosure } from "@/components/shared/disclosure";

import type { AskedQuestion } from "../types/playground.types";
import { AnswerText } from "./answer-text";
import { SourceLink } from "./source-link";

/**
 * The answer, its numbered sources and what produced it. `actions` (copy, ask again) and
 * `feedback` render below the answer, `followUps` after the sources.
 */
export function AnswerPanel({
	result,
	feedback,
	actions,
	followUps,
}: {
	result: AskedQuestion;
	feedback: ReactNode;
	actions?: ReactNode;
	followUps?: ReactNode;
}) {
	const { answer, citations, provenance } = result;
	return (
		<section aria-label="Answer" className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<p className="text-xs text-muted-foreground">You asked</p>
				<p className="text-sm font-medium">{result.question}</p>
			</div>
			<AnswerText
				text={answer ?? ""}
				citations={new Set(citations.map((citation) => citation.index))}
			/>
			{provenance ? (
				<div className="flex flex-wrap items-center justify-between gap-2">
					{feedback}
					{actions ? <div className="-me-3 flex items-center gap-1">{actions}</div> : null}
				</div>
			) : null}
			{citations.length > 0 ? (
				<div className="flex flex-col gap-2">
					<h3 className="text-xs font-medium">Sources</h3>
					<ol className="flex flex-col gap-1 text-xs">
						{citations.map((citation) => (
							<li key={citation.index} id={`citation-${citation.index}`} className="flex gap-2">
								<span className="tabular-nums text-muted-foreground">[{citation.index}]</span>
								<span className="font-medium">{citation.title}</span>
								<SourceLink source={citation.source} />
							</li>
						))}
					</ol>
				</div>
			) : null}
			{followUps}
			{provenance ? (
				<Disclosure summary="How this answer was made">
					<dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 ps-5 [&_dd]:break-all [&_dd]:font-mono [&_dd]:text-foreground [&_dt]:text-muted-foreground">
						<dt>Chat model</dt>
						<dd>{provenance.chatModel}</dd>
						<dt>Prompt</dt>
						<dd>{provenance.promptVersion}</dd>
						<dt>Embeddings</dt>
						<dd>{provenance.embeddingModel}</dd>
						<dt>Chunker</dt>
						<dd>{provenance.chunkerVersion}</dd>
						<dt>Reranker</dt>
						<dd>{provenance.reranker ?? "none"}</dd>
						<dt>Tokens</dt>
						<dd className="tabular-nums">
							{provenance.usage.inputTokens ?? "?"} in · {provenance.usage.outputTokens ?? "?"} out
						</dd>
						<dt>Request id</dt>
						<dd>{result.requestId}</dd>
					</dl>
				</Disclosure>
			) : null}
		</section>
	);
}
