import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createHashingEmbeddingGateway } from "@synapse/adapters/model-gateway";
import { createDatabase } from "@synapse/database";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import {
	BASELINES_DIR,
	baselineName,
	compareToBaseline,
	createUnavailableChat,
	evaluateRetrieval,
	formatRetrievalReport,
	RETRIEVAL_SEED,
	type RetrievalBaseline,
	toBaseline,
} from "@synapse/evaluation";
import { embeddingVersion } from "@synapse/knowledge";

import { loadEvaluationConfig } from "./config/evaluation.config";
import { DrizzleRagRepository, RagService } from "./modules/rag";

/**
 * `bun run eval:retrieval`: ingest the seed dataset into Postgres under a throwaway owner, run every
 * case through the real retrieval stack (pgvector + full-text + RRF) with offline hashing
 * embeddings, score recall@k and MRR, compare to the committed baseline, clean up.
 */
const config = loadEvaluationConfig();
const database = createDatabase({
	url: config.DATABASE_URL,
	poolMax: 2,
	...(config.DATABASE_SSL ? { ssl: config.DATABASE_SSL === "true" } : {}),
});
const embedding = createHashingEmbeddingGateway({ dimensions: EMBEDDING_DIMENSIONS });
const rag = new RagService(
	new DrizzleRagRepository(database.db),
	{ chat: createUnavailableChat(), embedding },
	{
		chunk: { size: config.EVAL_CHUNK_SIZE, overlap: config.EVAL_CHUNK_OVERLAP },
		defaultTopK: config.EVAL_K,
		searchMode: config.RAG_SEARCH_MODE,
		maxContextTokens: 3000,
	},
);
const ownerId = `eval-${crypto.randomUUID()}`;
/** stored document id → dataset document id */
const datasetIds = new Map<string, string>();

try {
	const ingested = await Promise.all(
		RETRIEVAL_SEED.documents.map(async (document) => ({
			datasetId: document.id,
			outcome: await rag.ingest(ownerId, document),
		})),
	);
	for (const { datasetId, outcome } of ingested) datasetIds.set(outcome.document.id, datasetId);

	const report = await evaluateRetrieval({
		dataset: RETRIEVAL_SEED,
		k: config.EVAL_K,
		setup: { embedding: embeddingVersion(embedding.info), mode: config.RAG_SEARCH_MODE },
		search: async (query) =>
			(await rag.search(ownerId, query, config.EVAL_K)).map(
				(match) => datasetIds.get(match.documentId) ?? match.documentId,
			),
	});

	const path = join(BASELINES_DIR, baselineName(report));
	if (config.EVAL_UPDATE_BASELINE) {
		await writeFile(path, `${JSON.stringify(toBaseline(report), null, "\t")}\n`);
		console.info(`${formatRetrievalReport(report)}\n\nbaseline written: ${path}`);
	} else if (existsSync(path)) {
		const baseline = JSON.parse(await readFile(path, "utf8")) as RetrievalBaseline;
		const comparison = compareToBaseline(report, baseline, config.EVAL_TOLERANCE);
		console.info(formatRetrievalReport(report, comparison));
		process.exitCode = comparison.passed ? 0 : 1;
	} else {
		console.info(`${formatRetrievalReport(report)}\n\nno baseline at ${path} (report only)`);
	}
} finally {
	await Promise.all([...datasetIds.keys()].map((id) => rag.deleteDocument(ownerId, id)));
	await database.close();
}
