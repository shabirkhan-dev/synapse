import { can } from "@synapse/security";

import type { Configuration } from "@/config";
import type { CircuitStatus } from "@/infrastructure/reliability/circuit-status";
import type { RagService } from "@/modules/rag";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { HTTP_STATUS } from "@/shared/constants/http-status";
import { AppError } from "@/shared/errors/app-error";
import type { AuthUser } from "@/shared/types/app-types";

import { SYSTEM_CHECKPOINT_LIMIT, SYSTEM_MESSAGES } from "../constants/system.constants";
import type { SystemRepository, SystemStatus } from "../types/system.types";

export type SystemServiceOptions = {
	repository: SystemRepository;
	circuits: CircuitStatus;
	config: Pick<Configuration, "observability" | "reliability">;
	rag: Pick<RagService, "versions">;
	startedAt?: Date;
	now?: () => Date;
};

/**
 * How this API process and its dependencies are doing, for admins and owners. Circuit states are
 * this process's own (replicas do not share them); job counts and checkpoints are global.
 */
export class SystemService {
	private readonly startedAt: Date;

	constructor(private readonly options: SystemServiceOptions) {
		this.startedAt = options.startedAt ?? new Date();
	}

	async status(user: AuthUser): Promise<SystemStatus> {
		if (!can(user.role, "audit.read_all")) {
			throw new AppError({
				statusCode: HTTP_STATUS.FORBIDDEN,
				code: ERROR_CODES.FORBIDDEN,
				message: SYSTEM_MESSAGES.ADMINS_ONLY,
			});
		}
		const { repository, circuits, config, rag } = this.options;
		const now = this.options.now?.() ?? new Date();
		const started = performance.now();
		const database = await repository.ping().then(
			() => ({ ok: true, latencyMs: Math.round(performance.now() - started) }),
			() => ({ ok: false, latencyMs: null }),
		);
		const [counts, checkpoints, chunkModels] = database.ok
			? await Promise.all([
					repository.jobCounts(),
					repository.checkpoints(SYSTEM_CHECKPOINT_LIMIT),
					repository.chunkModels(user.orgId),
				])
			: [null, [], []];
		const { embeddingModel, chunkerVersion } = rag.versions;
		const traceExport = config.observability.traceExport;
		return {
			checkedAt: now.toISOString(),
			uptimeSeconds: Math.round((now.getTime() - this.startedAt.getTime()) / 1000),
			database,
			circuits: circuits
				.snapshot()
				.map((circuit) =>
					Object.assign({}, circuit, { resetAfterMs: config.reliability.breaker.resetAfterMs }),
				),
			jobs: { counts, checkpoints },
			index: {
				embeddingModel,
				chunkerVersion,
				chunkModels: chunkModels.map((row) =>
					Object.assign({}, row, { current: row.embeddingModel === embeddingModel }),
				),
			},
			traces: traceExport
				? { destination: traceExport.destination, host: new URL(traceExport.endpoint).host }
				: { destination: "none", host: null },
		};
	}
}
