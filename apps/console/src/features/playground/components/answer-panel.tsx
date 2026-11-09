import type { ReactNode } from "react";

import type { AskedQuestion } from "../types/playground.types";
import { AnswerText } from "./answer-text";
import { SourceLink } from "./source-link";

/** The answer, its numbered sources and what produced it. `feedback` renders below the answer. */
export function AnswerPanel({ result, feedback }: { result: AskedQuestion; feedback: ReactNode }) {
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
			{provenance ? feedback : null}
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
			{provenance ? (
				<details className="text-xs text-muted-foreground">
					<summary className="cursor-pointer select-none">How this answer was made</summary>
					<dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
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
						<dd>
							{provenance.usage.inputTokens ?? "?"} in · {provenance.usage.outputTokens ?? "?"} out
						</dd>
						<dt>Request id</dt>
						<dd className="font-mono">{result.requestId}</dd>
					</dl>
				</details>
			) : null}
		</section>
	);
}
