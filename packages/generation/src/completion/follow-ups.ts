import type { CallOptions, ChatGateway, ModelInfo, TokenUsage } from "@synapse/core/contracts";

import { promptVersion } from "../prompts/prompt";
import { FOLLOW_UP_PROMPT } from "../prompts/templates";

export const FOLLOW_UPS_MAX = 3;
const FOLLOW_UP_MAX_CHARS = 140;

export type FollowUps = {
	questions: string[];
	model: ModelInfo;
	promptVersion: string;
	usage: TokenUsage;
};

/**
 * Up to three next questions for an answer, from the chat model. A reply that is not a JSON array
 * still yields its question-like lines; nothing usable gives an empty list, never an error.
 */
export async function suggestFollowUps({
	chat,
	question,
	answer,
	abortSignal,
}: CallOptions & { chat: ChatGateway; question: string; answer: string }): Promise<FollowUps> {
	const result = await chat.generateText({
		system: FOLLOW_UP_PROMPT.system,
		prompt: `<question>\n${question}\n</question>\n\n<answer>\n${answer}\n</answer>`,
		...(abortSignal ? { abortSignal } : {}),
	});
	return {
		questions: readFollowUps(result.text, question),
		model: result.model,
		promptVersion: promptVersion(FOLLOW_UP_PROMPT),
		usage: result.usage,
	};
}

/** The questions in a reply: a JSON array, else one per line; trimmed, deduplicated, capped. */
export function readFollowUps(text: string, asked = ""): string[] {
	let candidates: unknown[] = [];
	const array = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
	try {
		const parsed: unknown = JSON.parse(array);
		if (Array.isArray(parsed)) candidates = parsed;
	} catch {
		candidates = text.split("\n").map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, ""));
	}
	const seen = new Set([normalize(asked)]);
	const questions: string[] = [];
	for (const candidate of candidates) {
		if (typeof candidate !== "string") continue;
		const clean = candidate
			.replace(/\s+/g, " ")
			.replace(/^["'“]|["'”]$/g, "")
			.trim();
		if (!/[?？؟]$/.test(clean) || clean.length > FOLLOW_UP_MAX_CHARS) continue;
		const key = normalize(clean);
		if (seen.has(key)) continue;
		seen.add(key);
		questions.push(clean);
		if (questions.length === FOLLOW_UPS_MAX) break;
	}
	return questions;
}

const normalize = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
