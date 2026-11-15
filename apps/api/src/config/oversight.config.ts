import type { Env } from "./env";

export type OversightConfig = {
	/** An approval request nobody decides within this expires (ask again). */
	approvalTtlMs: number;
};

export function createOversightConfig(env: Env): OversightConfig {
	return { approvalTtlMs: env.APPROVAL_TTL_HOURS * 3_600_000 };
}
