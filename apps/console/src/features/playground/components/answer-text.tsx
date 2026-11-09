import { Fragment } from "react";

type Segment = { offset: number; text: string; citation: number | null };

/** Split an answer into text and `[n]` markers, each keyed by its character offset. */
function segments(text: string, citations: ReadonlySet<number>): Segment[] {
	const out: Segment[] = [];
	let offset = 0;
	for (const part of text.split(/(\[\d+\])/)) {
		const index = Number(/^\[(\d+)\]$/.exec(part)?.[1]);
		out.push({ offset, text: part, citation: citations.has(index) ? index : null });
		offset += part.length;
	}
	return out;
}

/**
 * The model's answer as plain text (never HTML), with each `[n]` that names a citation turned into
 * a link to it. Unknown markers stay as written.
 */
export function AnswerText({ text, citations }: { text: string; citations: ReadonlySet<number> }) {
	return (
		<p className="text-sm leading-relaxed whitespace-pre-wrap">
			{segments(text, citations).map((segment) =>
				segment.citation === null ? (
					<Fragment key={segment.offset}>{segment.text}</Fragment>
				) : (
					<a
						key={segment.offset}
						href={`#citation-${segment.citation}`}
						className="align-super text-[0.65rem] font-medium text-primary hover:underline"
						aria-label={`Source ${segment.citation}`}
					>
						[{segment.citation}]
					</a>
				),
			)}
		</p>
	);
}
