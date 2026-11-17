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

import { chunkText } from "@synapse/knowledge";

import {
	createRechunkDocumentsJob,
	createReembedChunksJob,
	DrizzleCheckpointRepository,
	DrizzleRechunkRepository,
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

	test("documents chunked before text-v2 are re-chunked with headings as context; a retry resumes", async () => {
		const rechunkOwner = `worker-it-${crypto.randomUUID()}`;
		const text = [
			"# Returns",
			"",
			"Items can be returned within 30 days of delivery. ".repeat(10).trim(),
			"",
			"## Exceptions",
			"",
			"Gift cards and personalised items cannot be returned. ".repeat(8).trim(),
		].join("\n");
		const zero = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
		const insertOld = async (title: string) => {
			const pieces = chunkText(text, { size: 300, overlap: 60 });
			const [document] = await database.db
				.insert(ragDocuments)
				.values({ ownerId: rechunkOwner, title, chunkCount: pieces.length })
				.returning();
			await database.db.insert(ragChunks).values(
				pieces.map((content, chunkIndex) => ({
					documentId: document?.id ?? "",
					ownerId: rechunkOwner,
					chunkIndex,
					content,
					embedding: zero,
					chunkerVersion: "text-v1;size=300;overlap=60",
					embeddingModel: "test:embed-new",
				})),
			);
			return document?.id ?? "";
		};
		const ids = [await insertOld("Policy A"), await insertOld("Policy B")].toSorted();
		// Already current: never touched.
		const [current] = await database.db
			.insert(ragDocuments)
			.values({ ownerId: rechunkOwner, title: "Current", chunkCount: 1 })
			.returning();
		await database.db.insert(ragChunks).values({
			documentId: current?.id ?? "",
			ownerId: rechunkOwner,
			chunkIndex: 0,
			content: "Already chunked by text-v2.",
			context: "Current",
			embedding: zero,
			chunkerVersion: "text-v2;size=1000;overlap=150",
			embeddingModel: "test:embed-new",
		});

		const documents = new DrizzleRechunkRepository(database.db);
		const checkpoints = new DrizzleCheckpointRepository(database.db);
		const job: QueueJob<{ ownerId?: string }> = {
			id: crypto.randomUUID(),
			queue: "knowledge.rechunk-documents",
			data: { ownerId: rechunkOwner },
			retryCount: 0,
		};
		const chunking = { size: 1000, overlap: 150 };
		// Attempt 1: the provider fails on the second document.
		const crashing = flakyEmbedding(2);
		await expect(
			createRechunkDocumentsJob({ documents, checkpoints, embedding: crashing, chunking, logger })(
				job,
			),
		).rejects.toThrow("embedding provider timed out");
		expect(await checkpoints.load(job.id)).toEqual({ afterDocumentId: ids[0], rechunked: 1 });

		const healthy = flakyEmbedding();
		await createRechunkDocumentsJob({
			documents,
			checkpoints,
			embedding: healthy,
			chunking,
			logger,
		})({
			...job,
			retryCount: 1,
		});
		expect(healthy.calls).toBe(1);
		expect(await checkpoints.load(job.id)).toBeNull();

		const rows = await database.db
			.select({
				documentId: ragChunks.documentId,
				context: ragChunks.context,
				version: ragChunks.chunkerVersion,
				content: ragChunks.content,
			})
			.from(ragChunks)
			.where(eq(ragChunks.ownerId, rechunkOwner));
		for (const id of ids) {
			const mine = rows.filter((row) => row.documentId === id);
			expect(mine.every((row) => row.version === "text-v2;size=1000;overlap=150")).toBe(true);
			expect(mine.some((row) => row.context?.endsWith("Returns › Exceptions"))).toBe(true);
			// Headings moved into the context; the text itself is all there once.
			expect(mine.some((row) => row.content.includes("# Returns"))).toBe(false);
			expect(mine.map((row) => row.content).join(" ")).toContain(
				"Gift cards and personalised items",
			);
			const [document] = await database.db
				.select({ chunkCount: ragDocuments.chunkCount })
				.from(ragDocuments)
				.where(eq(ragDocuments.id, id));
			expect(document?.chunkCount).toBe(mine.length);
		}
		expect(rows.filter((row) => row.documentId === current?.id)).toEqual([
			{
				documentId: current?.id ?? "",
				context: "Current",
				version: "text-v2;size=1000;overlap=150",
				content: "Already chunked by text-v2.",
			},
		]);

		// Nothing left: a new run does no work.
		const idle = flakyEmbedding();
		await createRechunkDocumentsJob({ documents, checkpoints, embedding: idle, chunking, logger })({
			...job,
			id: crypto.randomUUID(),
		});
		expect(idle.calls).toBe(0);
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
