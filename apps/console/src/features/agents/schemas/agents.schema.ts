import { z } from "zod";

const modelRef = z.object({ provider: z.string(), model: z.string() });

export const agentsOverviewSchema = z.object({
	models: z.object({
		chat: modelRef,
		fallbackChat: modelRef.nullable(),
		embedding: modelRef,
		reranker: modelRef.nullable(),
	}),
	chat: z.object({
		promptVersion: z.string(),
		maxSteps: z.number(),
		history: z.object({ maxTokens: z.number(), maxMessages: z.number() }),
		tools: z.array(z.object({ name: z.string(), description: z.string() })),
	}),
	answers: z.object({
		promptVersions: z.array(z.string()),
		searchMode: z.string(),
		topK: z.number(),
		maxContextTokens: z.number(),
	}),
	index: z.object({ embeddingModel: z.string(), chunkerVersion: z.string() }),
	guardrails: z.object({
		maxInputChars: z.number(),
		blockedTerms: z.number(),
		allowedTools: z.array(z.string()),
	}),
	approvals: z.array(z.object({ action: z.string(), label: z.string() })),
});

export const agentRunSchema = z.object({
	id: z.string(),
	agent: z.enum(["chat", "answer"]),
	actorId: z.string(),
	createdAt: z.string(),
	question: z.string().nullable(),
	chatModel: z.string().nullable(),
	promptVersion: z.string().nullable(),
	tools: z.array(z.string()),
	citations: z.number().nullable(),
	steps: z.number().nullable(),
	inputTokens: z.number().nullable(),
	outputTokens: z.number().nullable(),
});
