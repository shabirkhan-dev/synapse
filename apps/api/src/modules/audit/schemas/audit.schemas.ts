import { z } from "@hono/zod-openapi";

import {
	AUDIT_DEFAULT_LIMIT,
	AUDIT_MAX_LIMIT,
	USAGE_DEFAULT_DAYS,
	USAGE_MAX_DAYS,
} from "../constants/audit.constants";

export const listAuditEventsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(AUDIT_MAX_LIMIT).default(AUDIT_DEFAULT_LIMIT),
	action: z.string().min(1).max(100).optional().openapi({ example: "rag.query.answered" }),
});

export const auditEventSchema = z
	.object({
		id: z.uuid(),
		actorId: z.string(),
		action: z.string(),
		subjectType: z.string(),
		subjectId: z.string().nullable(),
		requestId: z.string().nullable(),
		data: z.record(z.string(), z.unknown()),
		provenance: z.record(z.string(), z.unknown()).nullable(),
		createdAt: z.string(),
	})
	.openapi("AuditEvent");

export const usageQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(USAGE_MAX_DAYS).default(USAGE_DEFAULT_DAYS),
});

const tokens = { inputTokens: z.number().int(), outputTokens: z.number().int() };

export const usageSchema = z
	.object({
		/** Whose answers: the organization's (admins, owners) or only the caller's (members). */
		scope: z.enum(["organization", "you"]),
		days: z.number().int(),
		/** Start of the window: midnight UTC, `days - 1` days before today. */
		since: z.string(),
		totals: z.object({
			answers: z.number().int(),
			...tokens,
			/** Estimated from `AI_MODEL_PRICES`; `null` when no answered model has a price. */
			costUsd: z.number().nullable(),
			/** Answers whose chat model has no price (left out of `costUsd`). */
			unpricedAnswers: z.number().int(),
		}),
		/** One entry per UTC day in the window, oldest first (zeros included). */
		daily: z.array(z.object({ day: z.string(), answers: z.number().int(), ...tokens })),
		/** By chat model, prompt version and embedding model, most answers first. */
		models: z.array(
			z.object({
				chatModel: z.string(),
				promptVersion: z.string(),
				embeddingModel: z.string(),
				answers: z.number().int(),
				...tokens,
				costUsd: z.number().nullable(),
			}),
		),
	})
	.openapi("Usage");
