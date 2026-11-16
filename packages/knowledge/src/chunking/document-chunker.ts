import { type ChunkOptions, chunkText } from "./text-chunker";

export type DocumentChunk = {
	content: string;
	/** Markdown headings above the chunk, outermost first (empty for text without headings). */
	headings: string[];
};

const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
const FENCE = /^\s*(```|~~~)/;

/** Text between Markdown headings, each with the path of headings it sits under. */
export function splitSections(text: string): Array<{ headings: string[]; body: string }> {
	const sections: Array<{ headings: string[]; body: string }> = [];
	const path: Array<{ level: number; title: string }> = [];
	let body: string[] = [];
	let inFence = false;
	const flush = () => {
		const joined = body.join("\n").trim();
		if (joined) sections.push({ headings: path.map((heading) => heading.title), body: joined });
		body = [];
	};
	for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
		if (FENCE.test(line)) inFence = !inFence;
		const heading = inFence ? null : HEADING.exec(line);
		if (!heading?.[1] || !heading[2]) {
			body.push(line);
			continue;
		}
		flush();
		const level = heading[1].length;
		while (path.length > 0 && (path.at(-1)?.level ?? 0) >= level) path.pop();
		path.push({ level, title: heading[2].replace(/[*_`]/g, "").trim() });
	}
	flush();
	return sections;
}

/**
 * Chunks that never cross a Markdown section, each with its heading path. Text without headings
 * is one section, so it chunks exactly like `chunkText`.
 */
export function chunkDocument(text: string, options: ChunkOptions): DocumentChunk[] {
	return splitSections(text).flatMap(({ headings, body }) =>
		chunkText(body, options).map((content) => ({ content, headings })),
	);
}

/**
 * What a chunk is about, in one line: the document title and the headings above it, e.g.
 * `Returns and refunds › Exceptions`. A first heading that repeats the title is dropped.
 */
export function chunkContext(title: string, headings: readonly string[]): string {
	const parts = [title.trim(), ...headings.map((heading) => heading.trim())].filter(Boolean);
	const deduped = parts.filter(
		(part, index) => index === 0 || part.toLowerCase() !== parts[index - 1]?.toLowerCase(),
	);
	return deduped.join(" › ");
}

/**
 * The text that is embedded for a chunk: its context line, then the chunk. Prepending the context
 * lets a passage under "Exceptions" match questions that name the document or section
 * (contextual retrieval).
 */
export function chunkEmbeddingText(context: string | null, content: string): string {
	return context ? `${context}\n\n${content}` : content;
}
