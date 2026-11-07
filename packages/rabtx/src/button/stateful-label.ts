/**
 * The letters a label rolls in as. Split by code point so an emoji or accented letter stays whole,
 * and a space keeps its width once it sits in its own inline-block.
 */
export function splitLetters(text: string): string[] {
	return Array.from(text);
}

/** How long a leaving label needs before it can be removed: the last letter's delay plus 160ms. */
export function exitMs(letters: number): number {
	return 160 + Math.max(0, letters - 1) * 12.5;
}
