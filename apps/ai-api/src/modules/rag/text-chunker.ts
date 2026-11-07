export type ChunkOptions = {
	/** Target max characters per chunk. */
	size: number;
	/** Characters carried over from the end of the previous chunk. */
	overlap: number;
};

const separators = ["\n\n", "\n", ". ", " "];

/**
 * Recursive character splitter: prefers paragraph, then line, sentence and word boundaries,
 * then packs pieces into chunks of at most `size` characters with `overlap` characters of
 * trailing context. Deterministic and dependency-free so it is easy to unit test.
 */
export function chunkText(input: string, { size, overlap }: ChunkOptions): string[] {
	if (overlap >= size) {
		throw new Error("overlap must be smaller than size");
	}
	const text = input.replace(/\r\n/g, "\n").trim();
	if (!text) {
		return [];
	}
	const pieces = splitRecursive(text, size, 0);
	const chunks: string[] = [];
	let current = "";

	for (const piece of pieces) {
		if (current && current.length + piece.length > size) {
			chunks.push(current.trim());
			const tail = overlap > 0 ? current.slice(-overlap) : "";
			current = tail.length + piece.length > size ? "" : tail;
		}
		current += piece;
	}
	if (current.trim()) {
		chunks.push(current.trim());
	}
	return chunks.filter(Boolean);
}

function splitRecursive(text: string, size: number, depth: number): string[] {
	if (text.length <= size) {
		return [text];
	}
	const separator = separators[depth];
	if (separator === undefined) {
		const hard: string[] = [];
		for (let index = 0; index < text.length; index += size) {
			hard.push(text.slice(index, index + size));
		}
		return hard;
	}
	const parts = text.split(separator);
	const out: string[] = [];
	parts.forEach((part, index) => {
		const piece = index < parts.length - 1 ? part + separator : part;
		if (!piece) return;
		out.push(...splitRecursive(piece, size, depth + 1));
	});
	return out;
}
