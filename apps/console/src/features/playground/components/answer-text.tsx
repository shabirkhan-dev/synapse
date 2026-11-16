import { Markdown } from "@/components/shared/markdown";

/**
 * The model's answer as Markdown (never raw HTML), with each `[n]` that names a citation turned
 * into an in-page link to that source.
 */
export function AnswerText({ text, citations }: { text: string; citations: ReadonlySet<number> }) {
	return <Markdown text={text} citations={citations} />;
}
