/**
 * Background jobs. Implemented in `@synapse/adapters/queue` (pg-boss on Postgres, ADR-0002).
 * Handlers must be safe to run again: a crash, deploy or timeout retries the same job.
 */
export interface QueueJob<TData = unknown> {
	id: string;
	queue: string;
	data: TData;
	/** 0 on the first attempt; the job id stays the same across retries. */
	retryCount: number;
}

export interface QueueOptions {
	/** `exclusive`: at most one job queued or running at a time (deduplicates on restart). */
	policy?: "standard" | "exclusive";
	retryLimit?: number;
	retryDelaySeconds?: number;
	/** A running job is retried after this long without finishing. */
	expireInSeconds?: number;
}

export type JobHandler<TData> = (job: QueueJob<TData>) => Promise<void>;

export interface JobQueue {
	start(): Promise<void>;
	/** Stop fetching and wait for running jobs to finish. */
	stop(): Promise<void>;
	createQueue(queue: string, options?: QueueOptions): Promise<void>;
	/** Returns the job id, or `null` when the queue's policy refused a duplicate. */
	send<TData extends object>(queue: string, data: TData): Promise<string | null>;
	/** Run `handler` for each job; a thrown error fails the attempt (and retries if allowed). */
	work<TData>(queue: string, handler: JobHandler<TData>): Promise<void>;
	/** Send a job on a cron schedule (UTC). */
	schedule(queue: string, cron: string, data?: object): Promise<void>;
}
