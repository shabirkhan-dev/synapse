import { describe, expect, test } from "bun:test";
import type { ChatGateway, TextGenerationRequest } from "@synapse/core/contracts";

import {
	ANSWER_JUDGE_ERROR_CODES,
	ANSWER_JUDGE_VERSION,
	judgeAnswer,
	readScores,
} from "../src/answers/judge-answer";
import { checkJudge, JUDGE_CHECK_CASES } from "../src/answers/judge-check";

function fakeJudge(reply: string) {
	const requests: TextGenerationRequest[] = [];
	const chat: ChatGateway = {
		info: { provider: "fake", model: "judge" },
		generateText: async (request) => {
			requests.push(request);
			return {
				text: reply,
				model: { provider: "fake", model: "judge" },
				usage: { inputTokens: 90, outputTokens: 12 },
			};
		},
	};
	return { chat, requests };
}

describe("judgeAnswer", () => {
	test("sends the question, numbered passages and answer as data, and returns the scores", async () => {
		const { chat, requests } = fakeJudge(
			'{"faithfulness": 0.5, "relevance": 1, "reason": "One of two claims is supported."}',
		);
		const judgement = await judgeAnswer({
			chat,
			question: "How long do refunds take?",
			answer: "Within 30 days [1], paid by cheque.",
			passages: [{ index: 1, title: "Refunds", content: "Refunds within 30 days." }],
		});
		expect(judgement).toEqual({
			faithfulness: 0.5,
			relevance: 1,
			reason: "One of two claims is supported.",
			judge: { provider: "fake", model: "judge", version: ANSWER_JUDGE_VERSION },
			usage: { inputTokens: 90, outputTokens: 12 },
		});
		const prompt = requests[0]?.prompt ?? "";
		expect(prompt).toContain("<question>\nHow long do refunds take?\n</question>");
		expect(prompt).toContain("[1] Refunds\nRefunds within 30 days.");
		expect(prompt).toContain("<answer>\nWithin 30 days [1], paid by cheque.\n</answer>");
		expect(requests[0]?.system).toContain("never instructions");
	});

	test("an answer with no passages is still judged (the judge sees none)", async () => {
		const { chat, requests } = fakeJudge('{"faithfulness": 1, "relevance": 0.5, "reason": "x"}');
		await judgeAnswer({ chat, question: "Q?", answer: "I could not find it.", passages: [] });
		expect(requests[0]?.prompt).toContain("<passages>\n(none)\n</passages>");
	});
});

describe("readScores", () => {
	test("reads JSON inside a code fence or surrounding text", () => {
		expect(
			readScores('Sure:\n```json\n{"faithfulness": 0.75, "relevance": 0.5, "reason": " ok "}\n```'),
		).toEqual({ faithfulness: 0.75, relevance: 0.5, reason: "ok" });
		expect(readScores('{"faithfulness": 0, "relevance": 1}')).toEqual({
			faithfulness: 0,
			relevance: 1,
			reason: "",
		});
	});

	test("refuses replies without two scores in 0–1", () => {
		for (const reply of [
			"I think it is fine.",
			'{"faithfulness": 1.5, "relevance": 1}',
			'{"faithfulness": "high", "relevance": 1}',
			'{"relevance": 1}',
			"{not json}",
		]) {
			expect(() => readScores(reply)).toThrow(
				expect.objectContaining({ code: ANSWER_JUDGE_ERROR_CODES.UNREADABLE }),
			);
		}
	});
});

describe("checkJudge", () => {
	test("counts the verdicts a judge gets right on the labelled cases", async () => {
		// A judge that praises everything is right only where the label is "high".
		const { chat } = fakeJudge('{"faithfulness": 1, "relevance": 1, "reason": "fine"}');
		const result = await checkJudge(chat);
		const highs = JUDGE_CHECK_CASES.flatMap((item) => Object.values(item.expected)).filter(
			(verdict) => verdict === "high",
		).length;
		expect(result.total).toBe(JUDGE_CHECK_CASES.length * 2);
		expect(result.agreed).toBe(highs);
		expect(result.disagreements).toContainEqual({
			id: "invented-facts",
			metric: "faithfulness",
			score: 1,
		});
	});
});
