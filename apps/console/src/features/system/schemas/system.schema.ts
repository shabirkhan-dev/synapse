import { z } from "zod";

export const systemStatusSchema = z.object({
	checkedAt: z.string(),
	uptimeSeconds: z.number(),
	database: z.object({ ok: z.boolean(), latencyMs: z.number().nullable() }),
	circuits: z.array(
		z.object({
			name: z.string(),
			state: z.enum(["closed", "open", "half-open"]),
			since: z.string().nullable(),
			resetAfterMs: z.number(),
		}),
	),
	jobs: z.object({
		counts: z
			.array(z.object({ queue: z.string(), state: z.string(), count: z.number() }))
			.nullable(),
		checkpoints: z.array(
			z.object({
				queue: z.string(),
				jobId: z.string(),
				updatedAt: z.string(),
				state: z.record(z.string(), z.unknown()),
			}),
		),
	}),
	index: z.object({
		embeddingModel: z.string(),
		chunkerVersion: z.string(),
		chunkModels: z.array(
			z.object({ embeddingModel: z.string().nullable(), chunks: z.number(), current: z.boolean() }),
		),
	}),
	traces: z.object({
		destination: z.enum(["langfuse", "otlp", "none"]),
		host: z.string().nullable(),
	}),
});
