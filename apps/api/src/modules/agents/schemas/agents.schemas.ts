import { z } from "@hono/zod-openapi";

const modelRef = z.object({ provider: z.string(), model: z.string() });

export const agentsOverviewSchema = z
	.object({
		models: z.object({
			chat: modelRef,
			fallbackChat: modelRef.nullable(),
			embedding: modelRef,
			reranker: modelRef.nullable(),
		}),
		chat: z.object({
			promptVersion: z.string(),
			maxSteps: z.number().int(),
			history: z.object({ maxTokens: z.number().int(), maxMessages: z.number().int() }),
			tools: z.array(z.object({ name: z.string(), description: z.string() })),
		}),
		answers: z.object({
			promptVersions: z.array(z.string()),
			searchMode: z.string(),
			topK: z.number().int(),
			maxContextTokens: z.number().int(),
		}),
		index: z.object({ embeddingModel: z.string(), chunkerVersion: z.string() }),
		guardrails: z.object({
			maxInputChars: z.number().int(),
			/** How many terms are blocked (the terms themselves are not shown). */
			blockedTerms: z.number().int(),
			allowedTools: z.array(z.string()),
		}),
		approvals: z.array(z.object({ action: z.string(), label: z.string() })),
	})
	.openapi("AgentsOverview");

export const agentRunSchema = z
	.object({
		id: z.string(),
		agent: z.enum(["chat", "answer"]),
		actorId: z.string(),
		createdAt: z.string(),
		question: z.string().nullable(),
		chatModel: z.string().nullable(),
		promptVersion: z.string().nullable(),
		tools: z.array(z.string()),
		citations: z.number().int().nullable(),
		steps: z.number().int().nullable(),
		inputTokens: z.number().int().nullable(),
		outputTokens: z.number().int().nullable(),
	})
	.openapi("AgentRun");
