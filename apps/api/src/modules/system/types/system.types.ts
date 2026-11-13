import type { CircuitSnapshot } from "@/infrastructure/reliability/circuit-status";

export type JobCount = { queue: string; state: string; count: number };
export type JobCheckpoint = {
	queue: string;
	jobId: string;
	updatedAt: string;
	state: Record<string, unknown>;
};
export type ChunkModelCount = { embeddingModel: string | null; chunks: number };

export interface SystemRepository {
	ping(): Promise<void>;
	/** pg-boss jobs by queue and state; null until the worker has created its schema. */
	jobCounts(): Promise<JobCount[] | null>;
	checkpoints(limit: number): Promise<JobCheckpoint[]>;
	chunkModels(ownerId: string): Promise<ChunkModelCount[]>;
}

export type SystemStatus = {
	checkedAt: string;
	uptimeSeconds: number;
	database: { ok: boolean; latencyMs: number | null };
	circuits: Array<CircuitSnapshot & { resetAfterMs: number }>;
	jobs: { counts: JobCount[] | null; checkpoints: JobCheckpoint[] };
	index: {
		embeddingModel: string;
		chunkerVersion: string;
		/** This organization's chunks by the embedding model that made them. */
		chunkModels: Array<ChunkModelCount & { current: boolean }>;
	};
	traces: { destination: "langfuse" | "otlp" | "none"; host: string | null };
};
