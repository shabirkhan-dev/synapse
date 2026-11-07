/** A versioned prompt. Bump `version` whenever the text changes; it is recorded on every answer. */
export type PromptTemplate = {
	id: string;
	version: number;
	system: string;
};

/** `rag-answer@1` */
export function promptVersion({ id, version }: PromptTemplate): string {
	return `${id}@${version}`;
}
