import type { JobHandler, JobQueue, QueueOptions } from "@synapse/core/contracts";
import { PgBoss } from "pg-boss";

export type PgBossJobQueueOptions = {
	connectionString: string;
	/** Postgres schema pg-boss owns (created and migrated by pg-boss on start). */
	schema?: string;
	ssl?: boolean;
	/** Errors pg-boss raises outside a job (connection loss, maintenance). */
	onError: (error: Error) => void;
};

/** `JobQueue` on pg-boss: jobs live in Postgres and are claimed with `SKIP LOCKED`. */
export function createPgBossJobQueue({
	connectionString,
	schema = "pgboss",
	ssl,
	onError,
}: PgBossJobQueueOptions): JobQueue {
	const boss = new PgBoss({ connectionString, schema, ...(ssl === undefined ? {} : { ssl }) });
	boss.on("error", onError);

	return {
		async start() {
			await boss.start();
		},
		stop: () => boss.stop({ graceful: true }),
		createQueue: (queue: string, options: QueueOptions = {}) =>
			boss.createQueue(queue, {
				...(options.policy ? { policy: options.policy } : {}),
				...(options.retryLimit === undefined ? {} : { retryLimit: options.retryLimit }),
				...(options.retryDelaySeconds === undefined
					? {}
					: { retryDelay: options.retryDelaySeconds, retryBackoff: true }),
				...(options.expireInSeconds === undefined
					? {}
					: { expireInSeconds: options.expireInSeconds }),
			}),
		send: (queue, data) => boss.send(queue, data),
		async work<TData>(queue: string, handler: JobHandler<TData>) {
			await boss.work<TData>(queue, async (jobs) => {
				for (const job of jobs) {
					// Sequential: one job per fetch by default; keeps checkpoints simple.
					// oxlint-disable-next-line no-await-in-loop
					await handler({
						id: job.id,
						queue: job.name,
						data: job.data,
						retryCount: job.retryCount,
					});
				}
			});
		},
		schedule: (queue, cron, data) => boss.schedule(queue, cron, data ?? null, { tz: "UTC" }),
	};
}
