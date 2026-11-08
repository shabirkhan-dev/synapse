export type InputPolicyOptions = {
	maxChars: number;
	/** Case-insensitive terms that block a request (whole words or phrases). */
	blockedTerms: string[];
};

export type InputVerdict =
	| { allowed: true }
	| { allowed: false; reason: "too_long"; limit: number }
	| { allowed: false; reason: "blocked_term"; term: string };

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Checks user input before any retrieval or model call. */
export function createInputPolicy({ maxChars, blockedTerms }: InputPolicyOptions) {
	const terms = blockedTerms
		.map((term) => term.trim())
		.filter(Boolean)
		.map((term) => ({ term, pattern: new RegExp(`(?<!\\w)${escape(term)}(?!\\w)`, "i") }));

	return {
		check(text: string): InputVerdict {
			if (text.length > maxChars) {
				return { allowed: false, reason: "too_long", limit: maxChars };
			}
			const hit = terms.find(({ pattern }) => pattern.test(text));
			return hit ? { allowed: false, reason: "blocked_term", term: hit.term } : { allowed: true };
		},
	};
}

export type InputPolicy = ReturnType<typeof createInputPolicy>;
