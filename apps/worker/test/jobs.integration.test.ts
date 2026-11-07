import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createHashingEmbeddingGateway } from "@synapse/adapters/model-gateway";
import { createPgBossJobQueue } from "@synapse/adapters/queue";
import type { EmbeddingGateway, QueueJob } from "@synapse/core/contracts";
import {
	authRateLimits,
	createDatabase,
	ragChunks,
	ragDocuments,
	runMigrations,
	sourceMigrationsFolder,
} from "@synapse/database";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import { createLogger } from "@synapse/observability";
import { eq, sql } from "drizzle-orm";

import {
	createReembedChunksJob,
	DrizzleCheckpointRepository,
	DrizzleReembedRepository,
} from "@/modules/knowledge";
import { DrizzleMaintenanceRepository } from "@/modules/maintenance";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database with pgvector. */
const url = process.env.API_TEST_DATABASE_URL;
const logger = createLogger({ service: "worker-test", level: "ERROR" });

/** Hashing embeddings that fail on the given `embedMany` call (1-based), like a provider outage. */
function flakyEmbedding(failOnCall?: number): EmbeddingGateway & { calls: number } {
	const base = createHashingEmbeddingGateway({ dimensions: EMBEDDING_DIMENSIONS });
	const gateway = {
		calls: 0,
		info: { provider: "test", model: "embed-new" },
		embed: base.embed,
		async embedMany(values: string[]) {
			gateway.calls += 1;
			if (gateway.calls === failOnCall) throw new Error("embedding provider timed out");
			return base.embedMany(values);
		},
	};
	return gateway;
}

describe.skipIf(!url)("worker jobs (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 3 });
	const owner = `worker-it-${crypto.randomUUID()}`;

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		await database.db.execute(sql`delete from rag_documents where owner_id like 'worker-it-%'`);
		await database.close();
	});

	test("a re-embed job killed mid-run resumes from its checkpoint", async () => {
		const [document] = await database.db
			.insert(ragDocuments)
			.values({ ownerId: owner, title: "Old vectors", chunkCount: 5 })
			.returning();
		const zero = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
		await database.db.insert(ragChunks).values(
			Array.from({ length: 5 }, (_, chunkIndex) => ({
				documentId: document?.id ?? "",
				ownerId: owner,
				chunkIndex,
				content: `chunk number ${chunkIndex}`,
				embedding: zero,
				embeddingModel: "test:embed-old",
			})),
		);
		const chunks = new DrizzleReembedRepository(database.db);
		const checkpoints = new DrizzleCheckpointRepository(database.db);
		// Scoped to this test's owner: other suites write chunks to the same database in parallel.
		const job: QueueJob<{ ownerId?: string }> = {
			id: crypto.randomUUID(),
			queue: "knowledge.reembed-chunks",
			data: { ownerId: owner },
			retryCount: 0,
		};
		const models = async () =>
			(
				await database.db
					.select({ model: ragChunks.embeddingModel })
					.from(ragChunks)
					.where(eq(ragChunks.ownerId, owner))
			).map((row) => row.model);

		// Attempt 1: the provider fails on the third batch (batches of 2): 4 of 5 chunks done.
		const crashing = flakyEmbedding(3);
		const attempt = createReembedChunksJob({
			chunks,
			checkpoints,
			embedding: crashing,
			batchSize: 2,
			logger,
		});
		await expect(attempt(job)).rejects.toThrow("embedding provider timed out");
		expect(await checkpoints.load(job.id)).toMatchObject({ reembedded: 4 });
		expect((await models()).filter((model) => model === "test:embed-new")).toHaveLength(4);

		// Attempt 2 (same job id, as a queue retry): only the last chunk is embedded.
		const healthy = flakyEmbedding();
		const retry = createReembedChunksJob({
			chunks,
			checkpoints,
			embedding: healthy,
			batchSize: 2,
			logger,
		});
		await retry({ ...job, retryCount: 1 });
		expect(healthy.calls).toBe(1);
		expect(await models()).toEqual(Array.from({ length: 5 }, () => "test:embed-new"));
		expect(await checkpoints.load(job.id)).toBeNull();
	});

	test("pg-boss delivers jobs and the exclusive policy refuses duplicates", async () => {
		const queue = createPgBossJobQueue({
			connectionString: url ?? "",
			schema: "pgboss_test",
			onError: (error) => logger.error("queue error", { error }),
		});
		await queue.start();
		const name = `test.exclusive-${crypto.randomUUID().slice(0, 8)}`;
		await queue.createQueue(name, { policy: "exclusive" });

		const first = await queue.send(name, { n: 1 });
		expect(first).toBeString();
		expect(await queue.send(name, { n: 2 })).toBeNull();

		const received = new Promise<QueueJob<{ n: number }>>((resolve) => {
			void queue.work<{ n: number }>(name, async (job) => resolve(job));
		});
		const job = await received;
		expect(job).toMatchObject({ id: first, queue: name, data: { n: 1 }, retryCount: 0 });
		await queue.stop();
	}, 30_000);

	test("prune deletes only rows past their retention", async () => {
		const fresh = `worker-it-fresh-${crypto.randomUUID()}`;
		const stale = `worker-it-stale-${crypto.randomUUID()}`;
		await database.db.insert(authRateLimits).values([
			{ key: fresh, windowStartedAt: new Date(), attempts: 1 },
			{ key: stale, windowStartedAt: new Date(Date.now() - 2 * 86_400_000), attempts: 3 },
		]);
		const counts = await new DrizzleMaintenanceRepository(database.db).prune();
		expect(counts.rateLimits).toBeGreaterThanOrEqual(1);
		const left = await database.db
			.select({ key: authRateLimits.key })
			.from(authRateLimits)
			.where(sql`${authRateLimits.key} in (${fresh}, ${stale})`);
		expect(left).toEqual([{ key: fresh }]);
		await database.db.delete(authRateLimits).where(eq(authRateLimits.key, fresh));
	});
});
