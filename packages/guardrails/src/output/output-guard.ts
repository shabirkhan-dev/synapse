export type OutputGuardOptions = {
	/** Removes secrets (keys, tokens) from text; `redactSecrets` from `@synapse/security`. */
	redactSecrets: (text: string) => string;
};

/** Text deltas of one streamed reply in, the same text with secrets replaced out. */
export type StreamRedactor = {
	/** The part of the text so far that is safe to send; a word that may still grow is held back. */
	push(delta: string): string;
	/** Everything still held back, checked. Call when the text ends. */
	flush(): string;
	/** Whether anything was replaced so far. */
	readonly redacted: boolean;
};

/** A word longer than this is checked and sent even without a space after it (bounds the buffer). */
const MAX_HELD_CHARS = 2048;
/** `Bearer <token>` is the one secret with a space in it: hold `Bearer` until its token is complete. */
const TRAILING_BEARER = /\bbearer\s*$/i;

/** Model output checks before it is returned: leaked secrets are replaced. */
export function createOutputGuard({ redactSecrets }: OutputGuardOptions) {
	return {
		check(text: string): { text: string; redacted: boolean } {
			const cleaned = redactSecrets(text);
			return { text: cleaned, redacted: cleaned !== text };
		},

		/**
		 * For streamed replies: a secret may arrive split across deltas, so text is sent only up to
		 * the last whitespace (secrets have none) and the trailing word waits for the next delta.
		 */
		streamRedactor(): StreamRedactor {
			let held = "";
			let redacted = false;
			const clean = (text: string) => {
				const cleaned = redactSecrets(text);
				if (cleaned !== text) redacted = true;
				return cleaned;
			};
			return {
				push(delta) {
					held += delta;
					let end = held.search(/\s\S*$/) + 1;
					if (end === 0) {
						// No whitespace yet: one growing word.
						if (held.length <= MAX_HELD_CHARS) return "";
						end = held.length;
					}
					let ready = held.slice(0, end);
					const bearer = TRAILING_BEARER.exec(ready);
					if (bearer) ready = ready.slice(0, bearer.index);
					held = held.slice(ready.length);
					return ready ? clean(ready) : "";
				},
				flush() {
					const rest = held;
					held = "";
					return rest ? clean(rest) : "";
				},
				get redacted() {
					return redacted;
				},
			};
		},
	};
}

export type OutputGuard = ReturnType<typeof createOutputGuard>;
