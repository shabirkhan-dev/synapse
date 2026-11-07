/** How strong a password looks: 0 for empty, then weak, fair, good and strong. */
export type StrengthScore = 0 | 1 | 2 | 3 | 4;

/** The shortest password the sign-up form accepts. */
export const MIN_PASSWORD_LENGTH = 8;

export const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"] as const;

/** A few habits that make a long password easy to guess anyway. */
const PREDICTABLE = [
	/^(.)\1+$/,
	/^(?:0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf|pass|letmein)/i,
];

/**
 * A quick strength score for feedback while typing, weighted to length the way NIST SP 800-63B
 * advises: mixing letters, digits and symbols only nudges the score, and nothing under the minimum
 * gets past weak. It is a hint for the person typing, not a check; do the real one on the server
 * (length, and a breached-password list).
 */
export function passwordStrength(password: string): StrengthScore {
	if (!password) return 0;
	if (password.length < MIN_PASSWORD_LENGTH) return 1;
	if (PREDICTABLE.some((pattern) => pattern.test(password))) return 1;

	const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z\d]/].filter((kind) =>
		kind.test(password),
	).length;
	let score = 2;
	if (password.length >= 12) score += 1;
	if (password.length >= 16) score += 1;
	if (kinds >= 3) score += 1;
	return Math.min(score, 4) as StrengthScore;
}
