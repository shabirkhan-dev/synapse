/**
 * Phrases that try to steer the model rather than inform it: the usual shapes of prompt injection
 * hidden in documents, tool output or stored memory. Matching text is replaced, not the passage,
 * so the facts around it still reach the model.
 */
const INSTRUCTION_PATTERNS: RegExp[] = [
	// "ignore all previous instructions", "disregard the above rules", "forget your prompt"
	/\b(?:ignore|disregard|forget|override|bypass)\b[^.\n]{0,40}?\b(?:instructions?|prompts?|rules?|directions?|guidelines?)\b/gi,
	// "you are now DAN", "from now on you will"
	/\byou are now\b[^.\n]{0,80}/gi,
	/\bfrom now on,? you\b[^.\n]{0,80}/gi,
	// "new instructions:", "system prompt:", "developer message:"
	/\b(?:new|updated|real|actual)\s+instructions?\s*:/gi,
	/\b(?:system|developer)\s+(?:prompt|message|instructions?)\s*:/gi,
	// "reveal your system prompt", "print the hidden instructions"
	/\b(?:reveal|print|show|repeat|output|leak)\b[^.\n]{0,30}?\b(?:system prompt|hidden instructions?|your instructions|your prompt)\b/gi,
	// Chat-template and role markers: <|im_start|>, <|system|>, "### System", "assistant:" at line start
	/<\|?\s*(?:im_start|im_end|system|assistant|user|endoftext)\s*\|?>/gi,
	/^\s*#{1,6}\s*(?:system|assistant|instructions?)\b.*$/gim,
	/^\s*(?:system|assistant)\s*:/gim,
];

export const REMOVED_INSTRUCTION = "[instruction removed]";

export type SanitizedText = { text: string; flagged: boolean; matches: string[] };

/** Replace instruction-like phrases in untrusted text with a marker. */
export function sanitizeUntrustedText(text: string): SanitizedText {
	const matches: string[] = [];
	let result = text;
	for (const pattern of INSTRUCTION_PATTERNS) {
		result = result.replace(pattern, (match) => {
			matches.push(match.trim());
			return REMOVED_INSTRUCTION;
		});
	}
	return { text: result, flagged: matches.length > 0, matches };
}

/** Sanitize the `content` of each passage; `flagged` lists the ids whose content changed. */
export function sanitizePassages<TPassage extends { id: string; content: string }>(
	passages: TPassage[],
): { passages: TPassage[]; flagged: Array<{ id: string; matches: string[] }> } {
	const flagged: Array<{ id: string; matches: string[] }> = [];
	const sanitized = passages.map((passage) => {
		const result = sanitizeUntrustedText(passage.content);
		if (!result.flagged) {
			return passage;
		}
		flagged.push({ id: passage.id, matches: result.matches });
		return Object.assign({}, passage, { content: result.text });
	});
	return { passages: sanitized, flagged };
}
