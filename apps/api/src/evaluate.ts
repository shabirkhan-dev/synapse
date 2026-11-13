import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
	createHashingEmbeddingGateway,
	createReranker,
	createTermOverlapReranker,
} from "@synapse/adapters/model-gateway";
import { createPdfTextExtractor } from "@synapse/adapters/pdf";
import { createAuditLog } from "@synapse/audit";
import type { Reranker } from "@synapse/core/contracts";
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
import { GuardrailsService } from "./modules/guardrails";
import { DrizzleRagRepository, RagService } from "./modules/rag";

/**
 * `bun run eval:retrieval`: ingest the seed dataset into Postgres under a throwaway owner, run every
 * case through the real retrieval stack (pgvector + full-text + RRF) with offline hashing
 * embeddings, score recall@k and MRR, compare to the committed baseline, clean up. With
 * `EVAL_RERANKER`, the same cases are also searched with that reranker: both results are printed and
 * the reranked one is compared to its own baseline.
 */
const config = loadEvaluationConfig();
const database = createDatabase({
	url: config.DATABASE_URL,
	poolMax: 2,
	...(config.DATABASE_SSL ? { ssl: config.DATABASE_SSL === "true" } : {}),
});
const embedding = createHashingEmbeddingGateway({ dimensions: EMBEDDING_DIMENSIONS });
// Evaluation is not user activity: nothing goes to the audit trail.
const evaluationAudit = createAuditLog({
	store: {
		append: async (event) => ({ ...event, id: "", createdAt: "" }),
		list: async () => [],
		usage: async () => [],
	},
	redact: (data) => data,
});
const rerankErrors: unknown[] = [];
const ragWith = (reranker?: Reranker) =>
	new RagService(
		new DrizzleRagRepository(database.db),
		{ chat: createUnavailableChat(), embedding },
		{
			chunk: { size: config.EVAL_CHUNK_SIZE, overlap: config.EVAL_CHUNK_OVERLAP },
			defaultTopK: config.EVAL_K,
			searchMode: config.RAG_SEARCH_MODE,
			maxContextTokens: 3000,
			audit: evaluationAudit,
			guardrails: new GuardrailsService({ maxInputChars: 4000, blockedTerms: [] }, evaluationAudit),
			pdf: createPdfTextExtractor(),
			...(reranker
				? {
						rerank: {
							reranker,
							candidates: config.RAG_RERANK_CANDIDATES,
							// A silent fallback would score the fused order as if it were reranked.
							onError: (error: unknown) => rerankErrors.push(error),
						},
					}
				: {}),
		},
	);
const reranker: Reranker | undefined =
	config.EVAL_RERANKER === "term-overlap"
		? createTermOverlapReranker()
		: config.EVAL_RERANKER === "cohere"
			? createReranker({
					provider: "cohere",
					model: config.AI_RERANK_MODEL,
					...(config.COHERE_API_KEY ? { apiKey: config.COHERE_API_KEY } : {}),
				})
			: undefined;
const rag = ragWith();
const reranked = reranker ? ragWith(reranker) : undefined;
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

	const setup = { embedding: embeddingVersion(embedding.info), mode: config.RAG_SEARCH_MODE };
	const evaluate = (service: RagService, extra: Record<string, string> = {}) =>
		evaluateRetrieval({
			dataset: RETRIEVAL_SEED,
			k: config.EVAL_K,
			setup: { ...setup, ...extra },
			search: async (query) =>
				(await service.search(ownerId, query, config.EVAL_K)).map(
					(match) => datasetIds.get(match.documentId) ?? match.documentId,
				),
		});
	let report = await evaluate(rag);
	if (reranked && reranker) {
		const fused = report.metrics;
		report = await evaluate(reranked, {
			rerank: `${reranker.info.provider}:${reranker.info.model}`,
		});
		console.info(
			`without reranking: recall@${config.EVAL_K} ${(fused.recallAtK * 100).toFixed(1)}%   MRR ${fused.mrr.toFixed(3)}\n`,
		);
		if (rerankErrors.length > 0) {
			console.error(`reranker failed ${rerankErrors.length} time(s):`, rerankErrors[0]);
			process.exitCode = 1;
		}
	}

	const path = join(BASELINES_DIR, baselineName(report));
	if (config.EVAL_UPDATE_BASELINE) {
		await writeFile(path, `${JSON.stringify(toBaseline(report), null, "\t")}\n`);
		console.info(`${formatRetrievalReport(report)}\n\nbaseline written: ${path}`);
	} else if (existsSync(path)) {
		const baseline = JSON.parse(await readFile(path, "utf8")) as RetrievalBaseline;
		const comparison = compareToBaseline(report, baseline, config.EVAL_TOLERANCE);
		console.info(formatRetrievalReport(report, comparison));
		if (!comparison.passed) process.exitCode = 1;
	} else {
		console.info(`${formatRetrievalReport(report)}\n\nno baseline at ${path} (report only)`);
	}
} finally {
	await Promise.all([...datasetIds.keys()].map((id) => rag.deleteDocument(ownerId, id)));
	await database.close();
}
