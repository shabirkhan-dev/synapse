/**
 * A `LIKE` / `ILIKE` pattern matching `text` anywhere: `%`, `_` and `\` in the text are escaped, so
 * a search for "50%" finds "50%", not everything starting with "50".
 */
export function containsPattern(text: string): string {
	return `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
