import { describe, expect, test } from "bun:test";

import type { ChatGateway, TextGenerationRequest } from "@synapse/core/contracts";

import { createAnswerGenerator, RAG_ANSWER_PROMPT } from "../src";

function fakeChat(text: string): ChatGateway & { requests: TextGenerationRequest[] } {
	const requests: TextGenerationRequest[] = [];
	return {
		requests,
		info: { provider: "test", model: "chat-1" },
		async generateText(request) {
			requests.push(request);
			return { text, model: { provider: "test", model: "chat-1" }, usage: { inputTokens: 9 } };
		},
	};
}

describe("answer generator", () => {
	test("sends the versioned prompt and context, returns citations and provenance", async () => {
		const chat = fakeChat("Refunds take 30 days [2].");
		const generator = createAnswerGenerator({
			chat,
			embeddingModel: "test:embed-1",
			chunkerVersion: "text-v1;size=1000;overlap=150",
			maxContextTokens: 1000,
		});
		const answer = await generator.answer({
			question: "How long?",
			passages: [
				{ chunkId: "c1", documentId: "d1", title: "Cats", source: null, content: "Cats sleep." },
				{ chunkId: "c2", documentId: "d2", title: "Refunds", source: null, content: "30 days." },
			],
		});

		expect(chat.requests[0]?.system).toBe(RAG_ANSWER_PROMPT.system);
		expect(chat.requests[0]?.prompt).toBe(
			"[1] Cats\nCats sleep.\n\n[2] Refunds\n30 days.\n\nQuestion: How long?",
		);
		expect(answer.text).toBe("Refunds take 30 days [2].");
		expect(answer.citations.map((c) => c.chunkId)).toEqual(["c2"]);
		expect(answer.context).toHaveLength(2);
		expect(answer.provenance).toEqual({
			chatModel: "test:chat-1",
			promptVersion: "rag-answer@1",
			embeddingModel: "test:embed-1",
			chunkerVersion: "text-v1;size=1000;overlap=150",
			usage: { inputTokens: 9 },
		});
	});
});
