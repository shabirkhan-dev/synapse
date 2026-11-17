/**
 * The text a list of overlapping chunks came from (`chunkText`: each chunk after the first may
 * start with up to `overlap` characters from the end of the one before, trimmed). The longest
 * such overlap is dropped; when there is none (the chunker sometimes starts fresh) the chunks are
 * joined by a blank line. Whitespace at chunk edges is not recovered exactly.
 */
export function reassembleChunks(chunks: readonly string[], overlap: number): string {
	let text = "";
	for (const raw of chunks) {
		const chunk = raw.trim();
		if (!chunk) continue;
		if (!text) {
			text = chunk;
			continue;
		}
		const shared = sharedEdge(text, chunk, overlap);
		text = shared > 0 ? text + chunk.slice(shared) : `${text}\n\n${chunk}`;
	}
	return text;
}

/**
 * How many leading characters of `next` repeat the end of `text`: the longest `k` (at most
 * `overlap` plus a little for trimmed whitespace) where `next[0..k]`, without trailing
 * whitespace, ends `text`. A match shorter than a quarter of the overlap is taken as chance.
 */
function sharedEdge(text: string, next: string, overlap: number): number {
	const longest = Math.min(next.length, overlap + 8);
	const shortest = Math.max(8, Math.floor(overlap / 4));
	for (let k = longest; k >= shortest; k--) {
		const head = next.slice(0, k);
		const trimmed = head.trimEnd();
		if (trimmed.length >= shortest && text.endsWith(trimmed)) return trimmed.length;
	}
	return 0;
}

/** `size`/`overlap` from a chunker version (`text-v1;size=1000;overlap=150`); null when absent. */
export function chunkingOf(version: string | null): { size: number; overlap: number } | null {
	const size = /size=(\d+)/.exec(version ?? "")?.[1];
	const overlap = /overlap=(\d+)/.exec(version ?? "")?.[1];
	return size && overlap ? { size: Number(size), overlap: Number(overlap) } : null;
}
