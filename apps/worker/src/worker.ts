import { createModelGateway } from "@synapse/adapters/model-gateway";
import { createPgBossJobQueue } from "@synapse/adapters/queue";
import { createDatabase } from "@synapse/database";
import { createLogger, instrumentModelGateway } from "@synapse/observability";
import { withModelReliability } from "@synapse/reliability";

import { loadConfiguration } from "./config";
import { KNOWLEDGE_QUEUES } from "./modules/knowledge";
import { MAINTENANCE_QUEUES } from "./modules/maintenance";
import { registerJobs } from "./register-jobs";

const config = loadConfiguration();
const logger = createLogger({
	service: config.serviceName,
	level: config.logLevel,
	format: config.logFormat,
});

const database = createDatabase(config.database);
// A failed batch fails the job attempt; pg-boss retries the job and the checkpoint resumes it.
const gateway = instrumentModelGateway(
	withModelReliability(createModelGateway(config.ai), {
		...config.reliability,
		onEvent: (event) =>
			event.type === "circuit"
				? logger.warn(`circuit ${event.to}`, { dependency: event.name, from: event.from })
				: logger.warn(`${event.name} ${event.type}`, {
						dependency: event.name,
						error: event.error,
					}),
	}),
	{ logger },
);
const queue = createPgBossJobQueue({
	connectionString: config.database.url,
	...(config.database.ssl === undefined ? {} : { ssl: config.database.ssl }),
	onError: (error) => logger.error("job queue error", { error }),
});

await queue.start();
await registerJobs(queue, {
	db: database.db,
	embedding: gateway.embedding,
	reembedBatchSize: config.reembedBatchSize,
	chunking: config.chunking,
	logger,
});

// Every start checks for chunks from another embedding model (e.g. after the model changed) and
// for documents chunked before text-v2; the queues are exclusive, so restarts never stack runs.
if (config.ai.embedding.apiKey) {
	await queue.send(KNOWLEDGE_QUEUES.REEMBED_CHUNKS, {});
	await queue.send(KNOWLEDGE_QUEUES.RECHUNK_DOCUMENTS, {});
} else {
	logger.warn("no embedding API key: skipping the re-embedding and re-chunking checks");
}
logger.info("worker started", {
	queues: [
		KNOWLEDGE_QUEUES.REEMBED_CHUNKS,
		KNOWLEDGE_QUEUES.RECHUNK_DOCUMENTS,
		MAINTENANCE_QUEUES.PRUNE,
	],
});

async function shutdown(signal: string) {
	logger.info("worker stopping", { signal });
	await queue.stop();
	await database.close();
	process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
