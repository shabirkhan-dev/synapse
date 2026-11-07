import { and, isNotNull, lt, or, sql } from "drizzle-orm";

import {
	authRateLimits,
	authSessions,
	authTokens,
	type Database,
	jobCheckpoints,
} from "@synapse/database";

import { RETENTION_SECONDS } from "../constants/maintenance.constants";

export type PruneCounts = {
	rateLimits: number;
	authTokens: number;
	authSessions: number;
	jobCheckpoints: number;
};

const olderThan = (seconds: number) => sql`now() - make_interval(secs => ${seconds})`;

export class DrizzleMaintenanceRepository {
	constructor(private readonly db: Database) {}

	/** Delete finished rows past their retention. Safe to run any number of times. */
	async prune(): Promise<PruneCounts> {
		return this.db.transaction(async (tx) => {
			const rateLimits = await tx
				.delete(authRateLimits)
				.where(lt(authRateLimits.windowStartedAt, olderThan(RETENTION_SECONDS.RATE_LIMITS)))
				.returning({ key: authRateLimits.key });
			const tokens = await tx
				.delete(authTokens)
				.where(
					or(
						and(
							isNotNull(authTokens.usedAt),
							lt(authTokens.usedAt, olderThan(RETENTION_SECONDS.AUTH_TOKENS)),
						),
						lt(authTokens.expiresAt, olderThan(RETENTION_SECONDS.AUTH_TOKENS)),
					),
				)
				.returning({ id: authTokens.id });
			const sessions = await tx
				.delete(authSessions)
				.where(
					or(
						and(
							isNotNull(authSessions.revokedAt),
							lt(authSessions.revokedAt, olderThan(RETENTION_SECONDS.AUTH_SESSIONS)),
						),
						lt(authSessions.expiresAt, olderThan(RETENTION_SECONDS.AUTH_SESSIONS)),
					),
				)
				.returning({ id: authSessions.id });
			const checkpoints = await tx
				.delete(jobCheckpoints)
				.where(lt(jobCheckpoints.updatedAt, olderThan(RETENTION_SECONDS.JOB_CHECKPOINTS)))
				.returning({ jobId: jobCheckpoints.jobId });
			return {
				rateLimits: rateLimits.length,
				authTokens: tokens.length,
				authSessions: sessions.length,
				jobCheckpoints: checkpoints.length,
			};
		});
	}
}
