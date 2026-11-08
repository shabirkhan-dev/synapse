import type { Env } from "./env";

export type GuardrailsConfig = {
	maxInputChars: number;
	blockedTerms: string[];
};

export function createGuardrailsConfig(env: Env): GuardrailsConfig {
	return {
		maxInputChars: env.GUARDRAILS_MAX_INPUT_CHARS,
		blockedTerms: env.GUARDRAILS_BLOCKED_TERMS,
	};
}
