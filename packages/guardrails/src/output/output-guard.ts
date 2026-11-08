export type OutputGuardOptions = {
	/** Removes secrets (keys, tokens) from text; `redactSecrets` from `@synapse/security`. */
	redactSecrets: (text: string) => string;
};

/** Model output checks before it is returned: leaked secrets are replaced. */
export function createOutputGuard({ redactSecrets }: OutputGuardOptions) {
	return {
		check(text: string): { text: string; redacted: boolean } {
			const cleaned = redactSecrets(text);
			return { text: cleaned, redacted: cleaned !== text };
		},
	};
}

export type OutputGuard = ReturnType<typeof createOutputGuard>;
