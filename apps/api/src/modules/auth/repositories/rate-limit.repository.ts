import { sql } from "drizzle-orm";

import { authRateLimits, type Database } from "@synapse/database";

import type { RateLimiter, RateLimitResult, RateLimitRule } from "../types/auth.types";

/** Fixed-window counter in one upsert, so concurrent requests on any instance count correctly. */
export class DrizzleRateLimiter implements RateLimiter {
	constructor(private readonly db: Database) {}

	async hit(key: string, { limit, windowSeconds }: RateLimitRule): Promise<RateLimitResult> {
		const window = sql`make_interval(secs => ${windowSeconds})`;
		const expired = sql`${authRateLimits.windowStartedAt} <= now() - ${window}`;
		const [row] = await this.db
			.insert(authRateLimits)
			.values({ key, windowStartedAt: sql`now()`, attempts: 1 })
			.onConflictDoUpdate({
				target: authRateLimits.key,
				set: {
					attempts: sql`case when ${expired} then 1 else ${authRateLimits.attempts} + 1 end`,
					windowStartedAt: sql`case when ${expired} then now() else ${authRateLimits.windowStartedAt} end`,
				},
			})
			.returning({
				attempts: authRateLimits.attempts,
				retryAfterSeconds: sql<number>`ceil(extract(epoch from ${authRateLimits.windowStartedAt} + ${window} - now()))`,
			});
		if (!row) {
			throw new Error("Rate limit upsert returned no row");
		}
		// `now()` is each transaction's start time: under contention a hit that started earlier can
		// see a window opened "after" it, so the raw value can exceed the window by a second.
		const retryAfterSeconds = Math.min(windowSeconds, Math.max(1, Number(row.retryAfterSeconds)));
		return { allowed: row.attempts <= limit, retryAfterSeconds };
	}
}
